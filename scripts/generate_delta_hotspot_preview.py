import json
import os
from PIL import Image, ImageDraw, ImageFont

hotspot_in = 'data/map_drafts/delta_hotspots_draft.json'
nav_in = 'data/map_drafts/delta_navigation_graph_draft.json'
previews_dir = 'data/map_drafts/previews'
report_path = 'data/map_drafts/review_report_hotspot.md'

os.makedirs(previews_dir, exist_ok=True)

with open(hotspot_in, 'r', encoding='utf-8') as f:
    hotspots_data = json.load(f)
    
with open(nav_in, 'r', encoding='utf-8') as f:
    nav_data = json.load(f)
    
report_lines = ["# Delta Mapping Hotspot Preview Report\n"]

total_rooms = 0
total_nodes = 0
total_edges = 0
rooms_without_hotspots = 0

for floor_hotspot in hotspots_data:
    f_num = floor_hotspot['floor']
    f_img = floor_hotspot['image']
    rooms = floor_hotspot.get('rooms', [])
    
    # Find matching nav data
    nav = next((n for n in nav_data if n['floor'] == f_num), {"nodes": [], "edges": [], "room_connections": []})
    nodes = nav.get('nodes', [])
    edges = nav.get('edges', [])
    
    report_lines.append(f"## Floor {f_num}")
    
    if f_img and os.path.exists(os.path.join('../mapping', f_img)):
        img_path = os.path.join('../mapping', f_img)
        img = Image.open(img_path).convert('RGBA')
        draw = ImageDraw.Draw(img)
        
        # Draw edges
        for e in edges:
            n1 = next((n for n in nodes if n['id'] == e['from']), None)
            n2 = next((n for n in nodes if n['id'] == e['to']), None)
            if n1 and n2:
                draw.line([(n1['x'], n1['y']), (n2['x'], n2['y'])], fill="green", width=4)
                total_edges += 1
                
        # Draw nodes
        for n in nodes:
            r = 8
            draw.ellipse([n['x']-r, n['y']-r, n['x']+r, n['y']+r], fill="green")
            total_nodes += 1
            
        # Draw hotspots
        for r_data in rooms:
            total_rooms += 1
            if r_data['x'] > 0 and r_data['y'] > 0:
                rad = r_data.get('click_radius', 15)
                draw.ellipse([r_data['x']-rad, r_data['y']-rad, r_data['x']+rad, r_data['y']+rad], fill=(255, 0, 0, 150))
                draw.text((r_data['label_x'], r_data['label_y']), r_data['room_code'], fill="blue")
            else:
                rooms_without_hotspots += 1
                
        out_path = os.path.join(previews_dir, f'floor{f_num}_hotspot_preview.png')
        img.save(out_path)
        report_lines.append(f"- **Official Image:** Present")
        report_lines.append(f"- **Rooms loaded:** {len(rooms)}")
        report_lines.append(f"- **Preview Saved:** `{out_path}`\n")
    else:
        report_lines.append(f"- **Official Image:** MISSING (Skipped preview)")
        total_rooms += len(rooms)
        rooms_without_hotspots += len(rooms)
        report_lines.append(f"- **Rooms loaded (no coords):** {len(rooms)}\n")

report_lines.append("## Overall Summary")
report_lines.append(f"- **Total Room Records:** {total_rooms}")
report_lines.append(f"- **Rooms lacking x,y coordinates:** {rooms_without_hotspots}")
report_lines.append(f"- **Total Navigation Nodes:** {total_nodes}")
report_lines.append(f"- **Total Navigation Edges:** {total_edges}")

with open(report_path, 'w', encoding='utf-8') as f:
    f.write("\n".join(report_lines))
    
print("Successfully generated hotspot previews and review report.")
