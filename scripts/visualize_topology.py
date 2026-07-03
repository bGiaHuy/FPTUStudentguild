import json
import os
from collections import defaultdict

TOPOLOGY_FILE = "building_topology.json"
OUTPUT_DIR = "topology_review"
HTML_FILE = os.path.join(OUTPUT_DIR, "topology_overview.html")
REPORT_FILE = os.path.join(OUTPUT_DIR, "topology_audit_report.md")

COLOR_MAP = {
    "room": "#4285F4",        # Blue
    "hallway": "#9AA0A6",     # Gray
    "stair": "#F4B400",       # Yellow
    "elevator": "#DB4437",    # Red
    "door": "#0F9D58",        # Green
    "bridge": "#AB47BC",      # Purple
    "entrance": "#FF7043",    # Orange
    "toilet": "#00ACC1",      # Cyan
    "unknown": "#000000"      # Black
}

def generate_svg(nodes, edges, cross_edges, title, min_x, min_y, max_x, max_y):
    scale = 20
    pad = 50
    width = (max_x - min_x) * scale + 2 * pad
    height = (max_y - min_y) * scale + 2 * pad
    if width < 100: width = 800
    if height < 100: height = 600

    svg = []
    svg.append(f'<h3>{title}</h3>')
    svg.append(f'<svg width="{width}" height="{height}" style="border:1px solid #ccc; background:#f9f9f9; margin-bottom: 20px;">')

    # Draw edges
    for e in edges:
        n1 = e['source_node']
        n2 = e['target_node']
        if n1 and n2 and 'x' in n1 and 'y' in n1 and 'x' in n2 and 'y' in n2:
            x1 = (n1['x'] - min_x) * scale + pad
            y1 = (n1['y'] - min_y) * scale + pad
            x2 = (n2['x'] - min_x) * scale + pad
            y2 = (n2['y'] - min_y) * scale + pad
            color = "#999"
            width_px = 2
            svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width_px}" />')

    # Draw cross-edges (dashed)
    for e in cross_edges:
        n1 = e['source_node']
        n2 = e['target_node']
        if n1 and n2 and 'x' in n1 and 'y' in n1 and 'x' in n2 and 'y' in n2:
            x1 = (n1['x'] - min_x) * scale + pad
            y1 = (n1['y'] - min_y) * scale + pad
            x2 = (n2['x'] - min_x) * scale + pad
            y2 = (n2['y'] - min_y) * scale + pad
            color = "#AB47BC"
            svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="2" stroke-dasharray="5,5" />')

    # Draw nodes
    for n in nodes:
        if 'x' in n and 'y' in n:
            x = (n['x'] - min_x) * scale + pad
            y = (n['y'] - min_y) * scale + pad
            color = COLOR_MAP.get(n.get('type', 'unknown'), COLOR_MAP['unknown'])
            r = 6 if n.get('type') == 'hallway' else 10
            svg.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" stroke="#333" stroke-width="1" />')
            svg.append(f'<text x="{x+12}" y="{y+4}" font-size="12" font-family="sans-serif" fill="#333">{n["id"]}</text>')

    svg.append('</svg>')
    return "\n".join(svg)


def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    try:
        with open(TOPOLOGY_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error loading {TOPOLOGY_FILE}: {e}")
        return

    raw_nodes = data.get('nodes', [])
    raw_edges = data.get('edges', [])
    raw_bridge_edges = data.get('bridge_edges', [])

    # Metrics
    duplicate_ids = set()
    node_map = {}
    nodes_missing_coords = []
    node_types = set()
    edge_types = set()
    
    nodes_by_floor = defaultdict(list)

    min_x, min_y = float('inf'), float('inf')
    max_x, max_y = float('-inf'), float('-inf')

    # Parse Nodes
    for n in raw_nodes:
        nid = n.get('id')
        if not nid: continue
        if nid in node_map:
            duplicate_ids.add(nid)
        node_map[nid] = n
        
        ntype = n.get('type', 'unknown')
        node_types.add(ntype)
        
        if 'x' not in n or 'y' not in n:
            nodes_missing_coords.append(nid)
            # temp coords
            n['x'] = 0
            n['y'] = 0
        else:
            min_x = min(min_x, n['x'])
            max_x = max(max_x, n['x'])
            min_y = min(min_y, n['y'])
            max_y = max(max_y, n['y'])
            
        floor = n.get('floor', 'Unknown Floor')
        nodes_by_floor[floor].append(n)

    if min_x == float('inf'): min_x = 0
    if min_y == float('inf'): min_y = 0
    if max_x == float('-inf'): max_x = 10
    if max_y == float('-inf'): max_y = 10

    # Parse Edges
    edges_missing_nodes = []
    cross_floor_edges = []
    edges_by_floor = defaultdict(list)
    degree = defaultdict(int)

    all_edges = raw_edges + raw_bridge_edges

    for e in all_edges:
        src = e.get('source')
        tgt = e.get('target')
        
        etype = e.get('type', 'default')
        edge_types.add(etype)

        if src not in node_map or tgt not in node_map:
            edges_missing_nodes.append((src, tgt))
            continue
            
        degree[src] += 1
        degree[tgt] += 1
        
        n1 = node_map[src]
        n2 = node_map[tgt]
        e['source_node'] = n1
        e['target_node'] = n2
        
        if n1.get('floor') == n2.get('floor'):
            edges_by_floor[n1.get('floor')].append(e)
        else:
            cross_floor_edges.append(e)

    # Isolated nodes
    isolated_nodes = [n for n in node_map if degree[n] == 0]

    # Generate HTML
    html_content = [
        "<!DOCTYPE html>",
        "<html><head><meta charset='utf-8'><title>Topology Overview</title></head>",
        "<body style='font-family:sans-serif; margin:20px;'>",
        "<h1>Building Topology Visualizer</h1>",
        "<div><b>Legend:</b> "
    ]
    
    for t, c in COLOR_MAP.items():
        html_content.append(f"<span style='display:inline-block; margin-right:15px;'><span style='display:inline-block; width:12px; height:12px; border-radius:50%; background-color:{c};'></span> {t}</span>")
    html_content.append("</div><hr/>")

    # Generate SVGs per floor
    for floor in sorted(nodes_by_floor.keys()):
        f_nodes = nodes_by_floor[floor]
        f_edges = edges_by_floor[floor]
        f_cross = [e for e in cross_floor_edges if e['source_node']['floor'] == floor or e['target_node']['floor'] == floor]
        html_content.append(generate_svg(f_nodes, f_edges, f_cross, f"Floor: {floor}", min_x, min_y, max_x, max_y))

    # All Floors Layered (Overview)
    html_content.append("<h2>All Floors Stacked</h2>")
    html_content.append(generate_svg(list(node_map.values()), raw_edges + raw_bridge_edges, [], "Full Building", min_x, min_y, max_x, max_y))

    html_content.append("</body></html>")
    
    with open(HTML_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(html_content))

    # Generate Markdown Report
    report = [
        "# Topology Audit Report",
        "",
        f"**File Inspected:** `{TOPOLOGY_FILE}`",
        "",
        "## 1. Counts Summary",
    ]
    
    for floor in sorted(nodes_by_floor.keys()):
        nc = len(nodes_by_floor[floor])
        ec = len(edges_by_floor[floor])
        report.append(f"- **{floor}:** {nc} nodes, {ec} intra-floor edges")
        
    report.append(f"- **Cross-Floor Edges:** {len(cross_floor_edges)}")
    report.append("")
    report.append("## 2. Types Found")
    report.append(f"- **Node Types:** {', '.join(node_types)}")
    report.append(f"- **Edge Types:** {', '.join(edge_types)}")
    report.append("")
    report.append("## 3. Suspicious Issues Detected")
    
    if duplicate_ids:
        report.append(f"- ⚠️ **Duplicate Node IDs:** {len(duplicate_ids)} found. ({', '.join(list(duplicate_ids)[:5])})")
    else:
        report.append("- ✅ No duplicate node IDs.")
        
    if nodes_missing_coords:
        report.append(f"- ⚠️ **Nodes Missing Coordinates:** {len(nodes_missing_coords)} found. Temporary coordinates (0,0) used for visualization.")
    else:
        report.append("- ✅ All nodes have coordinates.")
        
    if isolated_nodes:
        report.append(f"- ⚠️ **Isolated Nodes (0 connections):** {len(isolated_nodes)} found. ({', '.join(isolated_nodes[:10])})")
    else:
        report.append("- ✅ No isolated nodes.")
        
    if edges_missing_nodes:
        report.append(f"- ⚠️ **Dangling Edges (Missing Source/Target):** {len(edges_missing_nodes)} found.")
        for src, tgt in edges_missing_nodes[:5]:
            report.append(f"  - Edge {src} -> {tgt} points to non-existent node(s).")
    else:
        report.append("- ✅ All edges connect valid nodes.")

    report.append("")
    report.append("### Cross-Floor Edge Review")
    suspicious_cross = []
    for e in cross_floor_edges:
        n1 = e['source_node']
        n2 = e['target_node']
        if n1.get('type') not in ['stair', 'elevator', 'bridge'] and n2.get('type') not in ['stair', 'elevator', 'bridge']:
            suspicious_cross.append(f"{n1['id']} ({n1.get('type')}) -> {n2['id']} ({n2.get('type')})")
            
    if suspicious_cross:
        report.append(f"- ⚠️ **Suspicious Cross-Floor Edges:** {len(suspicious_cross)} cross-floor connections do not involve a stair, elevator, or bridge node!")
        for c in suspicious_cross[:5]:
            report.append(f"  - {c}")
    else:
        report.append("- ✅ All cross-floor edges appear to connect via stairs or elevators.")
        
    report.append("")
    report.append("## 4. Questions for Manual Review")
    report.append("1. **Isolated Nodes:** If there are isolated nodes, should they be connected to the nearest hallway, or removed?")
    report.append("2. **Dangling Edges:** If there are edges pointing to missing nodes, should we delete the edges or are we missing node data?")
    report.append("3. **Coordinate Scale:** Do the node coordinates look accurate on the visualizer? We applied a 20x scale multiplier to spread them out.")
    if suspicious_cross:
        report.append("4. **Cross-Floor Validity:** We found cross-floor edges between normal rooms/hallways. Is this a teleporter, or a graph mistake?")

    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(report))
        
    print(f"Topology visualization created at {HTML_FILE}")
    print(f"Audit report created at {REPORT_FILE}")

if __name__ == "__main__":
    main()
