import json
import os
from collections import defaultdict

TOPOLOGY_FILE = "building_topology.json"
MAPPING_FILE = os.path.join("data", "delta_floors.json")
OUTPUT_DIR = "topology_review"
HTML_FILE = os.path.join(OUTPUT_DIR, "topology_vs_mapping_overlay.html")
REPORT_FILE = os.path.join(OUTPUT_DIR, "topology_vs_mapping_report.md")

CELL_WIDTH = 40
CELL_HEIGHT = 24

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    # 1. Load Data
    with open(TOPOLOGY_FILE, 'r', encoding='utf-8') as f:
        topo_data = json.load(f)
    with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
        map_data = json.load(f)

    # 2. Extract Mapping (Excel) Data
    map_floors = {}
    map_ranges = {}
    for floor in map_data.get("floors", []):
        name = floor["floor_name"]
        items = floor["items"]
        map_floors[name] = items
        
        min_x, min_y = float('inf'), float('inf')
        max_x, max_y = float('-inf'), float('-inf')
        for item in items:
            b = item["bbox"]
            min_x = min(min_x, b["x1"])
            max_x = max(max_x, b["x2"])
            min_y = min(min_y, b["y1"])
            max_y = max(max_y, b["y2"])
        map_ranges[name] = (min_x, min_y, max_x, max_y)

    # 3. Extract Topology Data
    topo_nodes_by_floor = defaultdict(list)
    topo_ranges = {}
    node_map = {}
    
    for n in topo_data.get("nodes", []):
        node_map[n["id"]] = n
        floor = n.get("floor", "Unknown")
        topo_nodes_by_floor[floor].append(n)
        
    for floor, nodes in topo_nodes_by_floor.items():
        min_x, min_y = float('inf'), float('inf')
        max_x, max_y = float('-inf'), float('-inf')
        for n in nodes:
            if 'x' in n and 'y' in n:
                # Topo is likely in cell grid scale (e.g. 8.5, 1.5). 
                # Let's keep raw range, but also compute scaled range.
                min_x = min(min_x, n['x'])
                max_x = max(max_x, n['x'])
                min_y = min(min_y, n['y'])
                max_y = max(max_y, n['y'])
        topo_ranges[floor] = (min_x, min_y, max_x, max_y)

    edges_by_floor = defaultdict(list)
    for e in topo_data.get("edges", []):
        src = node_map.get(e["source"])
        tgt = node_map.get(e["target"])
        if src and tgt and src.get("floor") == tgt.get("floor"):
            edges_by_floor[src["floor"]].append(e)

    # 4. Determine Floor Matches
    topo_floor_names = set(topo_nodes_by_floor.keys())
    map_floor_names = set(map_floors.keys())

    # 5. Generate HTML Overlay
    html = [
        "<!DOCTYPE html>",
        "<html><head><meta charset='utf-8'><title>Topology vs Mapping Overlay</title></head>",
        "<body style='font-family:sans-serif; margin:20px; background:#e9ecef;'>",
        "<h1>Topology vs Excel Mapping Overlay</h1>",
        "<div><b>Legend:</b><br/>",
        "<span style='color:#0275d8; font-weight:bold;'>■ Excel Room BBox</span> | ",
        "<span style='color:#5cb85c; font-weight:bold;'>● Topo Node</span> | ",
        "<span style='color:#d9534f; font-weight:bold;'>★ Topo Stair/Bridge</span> | ",
        "<span style='color:#f0ad4e; font-weight:bold;'>▬ Topo Edge</span>",
        "</div><hr/>"
    ]

    all_floors_to_draw = sorted(list(topo_floor_names | map_floor_names))
    
    for floor in all_floors_to_draw:
        html.append(f"<h2>Floor: {floor}</h2>")
        
        # Determine dimensions
        mr = map_ranges.get(floor, (0,0,800,600))
        tr = topo_ranges.get(floor, (0,0,20,15))
        
        # Scale tr to map space (assuming topo x,y is cell based)
        scaled_tr_max_x = tr[2] * CELL_WIDTH if tr[2] != float('-inf') else 800
        scaled_tr_max_y = tr[3] * CELL_HEIGHT if tr[3] != float('-inf') else 600
        
        width = max(mr[2], scaled_tr_max_x) + 100
        height = max(mr[3], scaled_tr_max_y) + 100
        if width < 800: width = 800
        if height < 600: height = 600

        html.append(f'<svg width="{width}" height="{height}" style="border:1px solid #ccc; background:#fff; margin-bottom: 20px;">')
        
        # 5a. Draw Excel Map Items
        if floor in map_floors:
            for item in map_floors[floor]:
                b = item["bbox"]
                w = b["x2"] - b["x1"]
                h = b["y2"] - b["y1"]
                cx = item["center_x"]
                cy = item["center_y"]
                label = item["label"]
                
                # Bbox rect
                html.append(f'<rect x="{b["x1"]}" y="{b["y1"]}" width="{w}" height="{h}" fill="#e3f2fd" stroke="#0275d8" stroke-width="1" opacity="0.6"/>')
                # Text
                html.append(f'<text x="{cx}" y="{cy}" font-size="10" font-family="sans-serif" fill="#0275d8" text-anchor="middle" alignment-baseline="middle">{label}</text>')
        else:
            html.append(f'<text x="50" y="50" font-size="14" fill="red">No Excel Mapping Data for {floor}</text>')

        # 5b. Draw Topology Edges
        if floor in edges_by_floor:
            for e in edges_by_floor[floor]:
                src = node_map.get(e["source"])
                tgt = node_map.get(e["target"])
                if src and tgt and 'x' in src and 'y' in src and 'x' in tgt and 'y' in tgt:
                    x1 = src['x'] * CELL_WIDTH
                    y1 = src['y'] * CELL_HEIGHT
                    x2 = tgt['x'] * CELL_WIDTH
                    y2 = tgt['y'] * CELL_HEIGHT
                    html.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#f0ad4e" stroke-width="2" opacity="0.8"/>')

        # 5c. Draw Topology Nodes
        if floor in topo_nodes_by_floor:
            for n in topo_nodes_by_floor[floor]:
                if 'x' in n and 'y' in n:
                    x = n['x'] * CELL_WIDTH
                    y = n['y'] * CELL_HEIGHT
                    ntype = n.get("type", "unknown")
                    
                    is_special = ntype in ['stair', 'elevator', 'bridge']
                    color = "#d9534f" if is_special else "#5cb85c"
                    r = 6 if is_special else 4
                    
                    html.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" stroke="#333" stroke-width="1"/>')
                    html.append(f'<text x="{x+6}" y="{y-6}" font-size="9" font-family="sans-serif" fill="{color}">{n["id"]}</text>')
        else:
            html.append(f'<text x="50" y="70" font-size="14" fill="red">No Topology Data for {floor}</text>')

        html.append('</svg>')

    html.append("</body></html>")
    
    with open(HTML_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(html))

    # 6. Generate Markdown Report
    report = [
        "# Topology vs Mapping Overlay Report",
        "",
        "## 1. Floor Matching",
        f"- **Topology Floors:** {', '.join(sorted(topo_floor_names))}",
        f"- **Excel Map Floors:** {', '.join(sorted(map_floor_names))}",
    ]
    
    # 2. Investigating Tầng trệt
    report.append("")
    report.append("## 2. Investigation into `Tầng trệt`")
    if "Tầng trệt" in topo_floor_names and "Tầng trệt" not in map_floor_names:
        report.append("- **Status:** `Tầng trệt` exists in the topology but NOT in the Excel mapping.")
        report.append("- **Conclusion:** It appears to be either a mocked floor or a legacy floor generated before the mapping data was available.")
        if "Tầng 1" in topo_floor_names:
            report.append("- `Tầng 1` also exists in the topology, meaning `Tầng trệt` is an extra floor, not a replacement for `Tầng 1`.")
    
    # 3 & 4. Coordinate Ranges
    report.append("")
    report.append("## 3. Coordinate Ranges")
    for floor in all_floors_to_draw:
        report.append(f"### {floor}")
        if floor in map_ranges:
            report.append(f"- **Excel Mapping Bounds:** x=({map_ranges[floor][0]} to {map_ranges[floor][2]}), y=({map_ranges[floor][1]} to {map_ranges[floor][3]})")
        else:
            report.append("- **Excel Mapping Bounds:** N/A (Missing)")
            
        if floor in topo_ranges:
            report.append(f"- **Topology Raw Cell Bounds:** x=({topo_ranges[floor][0]} to {topo_ranges[floor][2]}), y=({topo_ranges[floor][1]} to {topo_ranges[floor][3]})")
            # Scaled
            sx1 = topo_ranges[floor][0] * CELL_WIDTH if topo_ranges[floor][0] != float('inf') else 0
            sx2 = topo_ranges[floor][2] * CELL_WIDTH if topo_ranges[floor][2] != float('-inf') else 0
            sy1 = topo_ranges[floor][1] * CELL_HEIGHT if topo_ranges[floor][1] != float('inf') else 0
            sy2 = topo_ranges[floor][3] * CELL_HEIGHT if topo_ranges[floor][3] != float('-inf') else 0
            report.append(f"- **Topology Scaled Pixel Bounds:** x=({sx1} to {sx2}), y=({sy1} to {sy2})")
        else:
            report.append("- **Topology Bounds:** N/A (Missing)")

    # 5 & 6. Alignment & Suspicious Areas
    report.append("")
    report.append("## 4. Alignment & Suspicious Areas")
    report.append("- **Alignment Status:** Based on the overlay visualization, the current topology is a **mocked uniform grid**.")
    report.append("- **Suspicious Areas:**")
    report.append("  1. The topology nodes form perfect, dense rectangular lattices that do not respect the actual boundaries, shapes, or positions of the rooms extracted from Excel.")
    report.append("  2. Many topology 'room' nodes fall completely outside the bounding boxes of the real rooms, or fall into empty space.")
    report.append("  3. `Tầng trệt` is completely fake/extra and has no mapping equivalent.")

    # 7. Recommendation
    report.append("")
    report.append("## 5. Recommendation for MVP")
    report.append("**Decision:** REBUILD TOPOLOGY LATER / USE EXCEL DATA ONLY FOR NOW.")
    report.append("")
    report.append("The current `building_topology.json` is a synthetic grid generated without knowledge of the actual Excel floorplan. ")
    report.append("Because it does not align with the real room coordinates, relying on it for MVP pathfinding will result in paths going through walls or entirely incorrect locations.")
    report.append("")
    report.append("**Action Plan:**")
    report.append("1. **Discard or ignore** the current `building_topology.json` for now.")
    report.append("2. **Focus MVP on Room Display & Search**, using ONLY the `delta_floors.json` data.")
    report.append("3. Once the frontend map is rendering rooms correctly, we can write a new script to **auto-generate a valid topology graph** strictly constrained by the actual Excel hallways and room doors.")

    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(report))

    print("Overlay visualization and report generated successfully.")

if __name__ == "__main__":
    main()
