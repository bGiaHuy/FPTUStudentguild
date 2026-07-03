import json

input_path = "frontend/public/data/delta_draft.json"
output_path = "frontend/public/data/delta_draft.json"

with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

for floor in data['floors']:
    f_num = floor['floor']
    floor['image'] = f"floor{f_num}vs2.jpg"
    floor['image_width'] = 2048
    floor['image_height'] = 1489
    
    for item in floor.get('items', []):
        item['bbox'] = {"min_x": 0, "min_y": 0, "max_x": 0, "max_y": 0}
        item['x'] = 0
        item['y'] = 0
        item['center_x'] = 0
        item['center_y'] = 0
        item['label_x'] = 0
        item['label_y'] = 0
        item['annotation_status'] = "unassigned"
        item['annotation_mode'] = ""
        item['source'] = ""
        item['confidence'] = ""

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# Also update the backup draft if it exists
input_path2 = "data/map_drafts/delta_hotspots_draft.json"
try:
    with open(input_path2, 'r', encoding='utf-8') as f:
        data2 = json.load(f)
    for floor in data2:
        f_num = floor['floor']
        floor['image'] = f"floor{f_num}vs2.jpg"
        for item in floor.get('rooms', []):
            item['bbox'] = {"min_x": 0, "min_y": 0, "max_x": 0, "max_y": 0}
            item['x'] = 0
            item['y'] = 0
            item['center_x'] = 0
            item['center_y'] = 0
            item['label_x'] = 0
            item['label_y'] = 0
            item['annotation_status'] = "unassigned"
            item['annotation_mode'] = ""
            item['source'] = ""
            item['confidence'] = ""
    with open(input_path2, 'w', encoding='utf-8') as f:
        json.dump(data2, f, ensure_ascii=False, indent=2)
except:
    pass

print("Updated delta_draft.json for vs2 images and reset coordinates.")
