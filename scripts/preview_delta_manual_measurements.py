import json
import os
from PIL import Image, ImageDraw

in_json = 'data/map_drafts/delta_manual_measurements_draft.json'
out_report = 'data/map_drafts/manual_measurement_report.md'
previews_dir = 'data/map_drafts/previews'

floor_images = {
    1: '../mapping/floor1.png',
    3: '../mapping/floor3.png'
}

os.makedirs(previews_dir, exist_ok=True)

if not os.path.exists(in_json):
    print("No draft JSON found.")
    exit(1)

with open(in_json, 'r', encoding='utf-8') as f:
    items = json.load(f)

total_items = len(items)
assigned_items = 0
unassigned_items = 0
rect_items = 0
point_items = 0

name_counts = {}
for i in items:
    name_counts[i['display_name']] = name_counts.get(i['display_name'], 0) + 1

dup_names = {k: v for k, v in name_counts.items() if v > 1}

suspicious = []
items_by_floor = {1: [], 3: []}

for i in items:
    f_num = i.get('floor')
    if f_num in items_by_floor:
        items_by_floor[f_num].append(i)
        
    if i.get('annotation_status') == 'assigned':
        assigned_items += 1
        b = i.get('bbox', {})
        mode = i.get('annotation_mode', '')
        
        if mode == 'rectangle':
            rect_items += 1
            if b.get('min_x', 0) == 0 and b.get('max_x', 0) == 0:
                suspicious.append(f"{i['item_id']}: rectangle mode but bbox is 0")
        elif mode == 'point':
            point_items += 1
        else:
            suspicious.append(f"{i['item_id']}: unknown annotation_mode '{mode}'")
            
        # Bounds check roughly (using floor 1/3 known max size for sanity, normally we'd check actual image size)
        max_w, max_h = (2048, 1426) if f_num == 3 else (1122, 689)
        if b.get('max_x', 0) > max_w or b.get('max_y', 0) > max_h or b.get('min_x', 0) < 0 or b.get('min_y', 0) < 0:
            suspicious.append(f"{i['item_id']}: bbox outside image bounds")
    else:
        unassigned_items += 1

report = [
    "# Manual Measurement QA Report",
    f"- **Total items:** {total_items}",
    f"- **Assigned (Rectangle):** {rect_items}",
    f"- **Assigned (Point):** {point_items}",
    f"- **Unassigned items:** {unassigned_items}",
    f"- **Duplicate display_name groups:** {len(dup_names)}",
    "\n## Suspicious Items"
]

for s in suspicious:
    report.append(f"- {s}")
if not suspicious:
    report.append("- None found.")

for f_num, img_path in floor_images.items():
    if not os.path.exists(img_path):
        continue
        
    img = Image.open(img_path).convert('RGBA')
    draw = ImageDraw.Draw(img)
    
    floor_items = items_by_floor[f_num]
    for r in floor_items:
        if r.get('annotation_status') == 'assigned':
            b = r.get('bbox', {})
            mode = r.get('annotation_mode', '')
            
            if mode == 'rectangle':
                color = "red" if r['display_name'] in dup_names else "green"
                draw.rectangle([b['min_x'], b['min_y'], b['max_x'], b['max_y']], outline=color, width=3)
            elif mode == 'point':
                cx, cy = r.get('center_x', 0), r.get('center_y', 0)
                draw.ellipse([cx-5, cy-5, cx+5, cy+5], fill="green")
            
            draw.text((r.get('label_x', 0), r.get('label_y', 0)), r['display_name'], fill="blue")

    out_png = os.path.join(previews_dir, f'floor{f_num}_manual_measurement_preview.png')
    img.save(out_png)

with open(out_report, 'w', encoding='utf-8') as f:
    f.write("\n".join(report))

print("Preview generation complete.")
