"""
build_routing_graph.py — Merge building_topology.json + delta_draft.json
into a unified routing graph (delta_route_graph.json) with pixel coordinates.

Usage:
    python scripts/build_routing_graph.py

Output:
    frontend/public/data/delta_route_graph.json
"""

import json
import math
import os
import sys

# Fix Windows console encoding for Vietnamese characters
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


# --- Paths ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

TOPOLOGY_PATH = os.path.join(PROJECT_ROOT, "failed map", "building_topology.json")
DRAFT_PATH = os.path.join(PROJECT_ROOT, "frontend", "public", "data", "delta_draft.json")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "frontend", "public", "data", "delta_route_graph.json")

# --- Floor name mapping: topology floor name -> delta_draft floor number ---
# "Tầng trệt" has no floor plan image in delta_draft, so we skip it.
FLOOR_NAME_TO_NUMBER = {
    "Tầng 1": 1,
    "Tầng 2": 2,
    "Tầng 3": 3,
    "Tầng 4": 4,
}

# --- Floor metadata from topology (grid dimensions) ---
# Will be populated from the topology file at runtime.
FLOOR_GRID_META = {}  # floor_name -> { grid_rows, grid_cols }

# --- Floor image dimensions from delta_draft ---
FLOOR_IMAGE_META = {}  # floor_number -> { image_width, image_height }


def load_json(path):
    """Load a JSON file with UTF-8 encoding."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def grid_to_pixel(grid_x, grid_y, floor_name, floor_number):
    """
    Convert grid coordinates to pixel coordinates.
    
    Topology uses a grid system where x is column, y is row.
    We map these to pixel coords using: pixel = (grid_pos / grid_max) * image_dim
    
    We add a small padding offset so edges don't land exactly on image border.
    """
    grid_meta = FLOOR_GRID_META.get(floor_name)
    image_meta = FLOOR_IMAGE_META.get(floor_number)
    
    if not grid_meta or not image_meta:
        return None, None
    
    grid_cols = grid_meta["grid_cols"]
    grid_rows = grid_meta["grid_rows"]
    img_w = image_meta["image_width"]
    img_h = image_meta["image_height"]
    
    # Map grid position to pixel, centering each cell
    # grid_x ranges roughly 1..grid_cols, grid_y ranges 1..grid_rows
    pixel_x = (grid_x / (grid_cols + 1)) * img_w
    pixel_y = (grid_y / (grid_rows + 1)) * img_h
    
    return round(pixel_x, 1), round(pixel_y, 1)


def euclidean_dist(x1, y1, x2, y2):
    """Euclidean distance between two points."""
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)


def find_nearest_node(target_x, target_y, floor_number, nodes_by_floor):
    """Find the nearest walkable node to a target pixel position on a floor."""
    candidates = nodes_by_floor.get(floor_number, [])
    best = None
    best_dist = float("inf")
    
    for node in candidates:
        if node["x"] is None or node["y"] is None:
            continue
        # Prefer hallway/corridor nodes as "entry points" to rooms
        d = euclidean_dist(target_x, target_y, node["x"], node["y"])
        # Give preference to hallway nodes (they're the actual walking paths)
        if node["type"] == "hallway":
            d *= 0.8  # slight preference
        if d < best_dist:
            best_dist = d
            best = node
    
    return best, best_dist


def build_routing_graph():
    """Main function to build the unified routing graph."""
    
    print(f"Loading topology from: {TOPOLOGY_PATH}")
    topology = load_json(TOPOLOGY_PATH)
    
    print(f"Loading delta draft from: {DRAFT_PATH}")
    draft = load_json(DRAFT_PATH)
    
    # --- Step 1: Build floor metadata ---
    for floor_meta in topology["floors"]:
        fname = floor_meta["floor_name"]
        FLOOR_GRID_META[fname] = {
            "grid_rows": floor_meta["grid_rows"],
            "grid_cols": floor_meta["grid_cols"],
        }
    
    for draft_floor in draft["floors"]:
        fnum = draft_floor["floor"]
        FLOOR_IMAGE_META[fnum] = {
            "image_width": draft_floor["image_width"],
            "image_height": draft_floor["image_height"],
        }
    
    # --- Step 2: Convert topology nodes to pixel coordinates ---
    output_nodes = []
    nodes_by_floor = {}  # floor_number -> [node, ...]
    node_lookup = {}  # node_id -> node
    skipped_floors = set()
    
    for topo_node in topology["nodes"]:
        floor_name = topo_node["floor"]
        floor_number = FLOOR_NAME_TO_NUMBER.get(floor_name)
        
        if floor_number is None:
            skipped_floors.add(floor_name)
            continue
        
        px, py = grid_to_pixel(topo_node["x"], topo_node["y"], floor_name, floor_number)
        
        if px is None:
            continue
        
        node = {
            "node_id": topo_node["id"],
            "floor": floor_number,
            "x": px,
            "y": py,
            "type": topo_node["type"],
            "label": topo_node["name"],
            "linked_room_code": None,
        }
        
        output_nodes.append(node)
        node_lookup[topo_node["id"]] = node
        
        if floor_number not in nodes_by_floor:
            nodes_by_floor[floor_number] = []
        nodes_by_floor[floor_number].append(node)
    
    if skipped_floors:
        print(f"  Skipped floors (no delta_draft mapping): {skipped_floors}")
    
    print(f"  Converted {len(output_nodes)} nodes to pixel coordinates")
    
    # --- Step 3: Link room codes from delta_draft items ---
    link_count = 0
    for draft_floor in draft["floors"]:
        fnum = draft_floor["floor"]
        for item in draft_floor.get("items", []):
            room_code = item.get("room_code", "").strip()
            if not room_code:
                continue
            if not item.get("is_clickable", False):
                continue
            
            bbox = item.get("bbox", {})
            center_x = (bbox.get("min_x", 0) + bbox.get("max_x", 0)) / 2
            center_y = (bbox.get("min_y", 0) + bbox.get("max_y", 0)) / 2
            
            # Find nearest node on this floor
            nearest, dist = find_nearest_node(center_x, center_y, fnum, nodes_by_floor)
            
            if nearest and dist < 500:  # reasonable proximity threshold
                nearest["linked_room_code"] = room_code
                link_count += 1
    
    print(f"  Linked {link_count} room codes to nearest nodes")
    
    # --- Step 4: Convert edges ---
    output_edges = []
    edge_id = 0
    valid_node_ids = set(node_lookup.keys())
    
    for topo_edge in topology["edges"]:
        src = topo_edge["source"]
        tgt = topo_edge["target"]
        
        if src not in valid_node_ids or tgt not in valid_node_ids:
            continue
        
        src_node = node_lookup[src]
        tgt_node = node_lookup[tgt]
        
        # Recalculate weight as pixel distance
        pixel_weight = euclidean_dist(src_node["x"], src_node["y"], tgt_node["x"], tgt_node["y"])
        
        edge_id += 1
        output_edges.append({
            "edge_id": f"E{edge_id}",
            "from_node_id": src,
            "to_node_id": tgt,
            "floor": src_node["floor"],
            "weight": round(pixel_weight, 1),
            "type": "corridor",
            "bidirectional": True,
        })
    
    print(f"  Converted {len(output_edges)} intra-floor edges")
    
    # --- Step 5: Build vertical connectors from bridge_edges ---
    vertical_connectors = []
    connector_groups = {}  # (sorted node pair type) -> connector
    
    for bridge in topology.get("bridge_edges", []):
        src = bridge["source"]
        tgt = bridge["target"]
        
        if src not in valid_node_ids or tgt not in valid_node_ids:
            # Bridge edge references a node on a skipped floor
            continue
        
        src_node = node_lookup[src]
        tgt_node = node_lookup[tgt]
        
        bridge_type = bridge.get("type", "stair_bridge")
        connector_type = "elevator" if "elevator" in bridge_type else "stair"
        
        # Also add as a regular edge so the A* can traverse it
        edge_id += 1
        output_edges.append({
            "edge_id": f"E{edge_id}",
            "from_node_id": src,
            "to_node_id": tgt,
            "floor": -1,  # cross-floor
            "weight": bridge.get("weight", 10.0) * 30,  # Scale up: topology weight 10 -> ~300px equivalent
            "type": connector_type,
            "bidirectional": True,
        })
        
        # Group into vertical connectors by position proximity
        # Use x-coordinate similarity to group same stairwell across floors
        group_key = f"{connector_type}_{round(src_node['x'], -1)}"
        
        if group_key not in connector_groups:
            connector_groups[group_key] = {
                "connector_id": f"VC{len(connector_groups) + 1}",
                "type": connector_type,
                "node_ids_by_floor": {},
                "weight": bridge.get("weight", 10.0) * 30,
            }
        
        vc = connector_groups[group_key]
        vc["node_ids_by_floor"][str(src_node["floor"])] = src
        vc["node_ids_by_floor"][str(tgt_node["floor"])] = tgt
    
    vertical_connectors = list(connector_groups.values())
    print(f"  Created {len(vertical_connectors)} vertical connectors from {len(topology.get('bridge_edges', []))} bridge edges")
    
    # --- Step 6: Build floor metadata for output ---
    output_floors = []
    for fnum in sorted(FLOOR_IMAGE_META.keys()):
        meta = FLOOR_IMAGE_META[fnum]
        floor_nodes = nodes_by_floor.get(fnum, [])
        floor_edges = [e for e in output_edges if e["floor"] == fnum]
        output_floors.append({
            "floor": fnum,
            "floor_name": f"Tầng {fnum}",
            "image_width": meta["image_width"],
            "image_height": meta["image_height"],
            "node_count": len(floor_nodes),
            "edge_count": len(floor_edges),
        })
    
    # --- Step 7: Assemble output ---
    output = {
        "building_code": "DELTA",
        "version": "v1",
        "coordinate_system": "pixel",
        "source": "build_routing_graph.py",
        "total_nodes": len(output_nodes),
        "total_edges": len(output_edges),
        "total_vertical_connectors": len(vertical_connectors),
        "floors": output_floors,
        "nodes": output_nodes,
        "edges": output_edges,
        "vertical_connectors": vertical_connectors,
    }
    
    # --- Step 8: Write output ---
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Output written to: {OUTPUT_PATH}")
    print(f"   Nodes: {output['total_nodes']}")
    print(f"   Edges: {output['total_edges']}")
    print(f"   Vertical connectors: {output['total_vertical_connectors']}")
    print(f"   Floors: {len(output['floors'])}")
    
    # --- Validation summary ---
    print("\n--- Validation ---")
    rooms_linked = sum(1 for n in output_nodes if n["linked_room_code"])
    rooms_total = sum(
        1 for df in draft["floors"]
        for item in df.get("items", [])
        if item.get("room_code", "").strip() and item.get("is_clickable", False)
    )
    print(f"   Rooms linked: {rooms_linked}/{rooms_total}")
    
    hallway_nodes = sum(1 for n in output_nodes if n["type"] == "hallway")
    print(f"   Hallway nodes (walkable): {hallway_nodes}")
    
    stair_nodes = sum(1 for n in output_nodes if n["type"] == "stair")
    print(f"   Stair nodes: {stair_nodes}")
    
    # Check connectivity per floor
    for fnum in sorted(nodes_by_floor.keys()):
        fn = len(nodes_by_floor[fnum])
        fe = sum(1 for e in output_edges if e["floor"] == fnum)
        print(f"   Floor {fnum}: {fn} nodes, {fe} edges")
    
    cross_floor_edges = sum(1 for e in output_edges if e["floor"] == -1)
    print(f"   Cross-floor edges: {cross_floor_edges}")
    
    return output


if __name__ == "__main__":
    if "--validate" in sys.argv:
        # Just validate existing output
        if os.path.exists(OUTPUT_PATH):
            data = load_json(OUTPUT_PATH)
            print(f"Existing output: {data['total_nodes']} nodes, {data['total_edges']} edges")
        else:
            print(f"No output found at {OUTPUT_PATH}")
            sys.exit(1)
    else:
        build_routing_graph()
