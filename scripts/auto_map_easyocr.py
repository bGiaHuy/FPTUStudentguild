import json
import easyocr
import re
import os

reader = easyocr.Reader(['en', 'vi'])

def auto_map():
    draft_path = "frontend/public/data/delta_draft.json"
    with open(draft_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for floor in data['floors']:
        f_num = floor['floor']
        img_path = f"frontend/public/mapping/floor{f_num}vs2.jpg"
        print(f"Processing Floor {f_num}...")
        
        results = reader.readtext(img_path)
        print(f"Found {len(results)} text blocks")
        
        # We will match based on text
        for res in results:
            polygon, text, conf = res
            if conf < 0.3: continue
            
            t_clean = re.sub(r'[^a-z0-9]', '', str(text).lower())
            if not t_clean: continue
            
            # polygon is [[x1,y1], [x2,y1], [x2,y2], [x1,y2]]
            xs = [p[0] for p in polygon]
            ys = [p[1] for p in polygon]
            
            min_x, max_x = int(min(xs)), int(max(xs))
            min_y, max_y = int(min(ys)), int(max(ys))
            cx = (min_x + max_x) // 2
            cy = (min_y + max_y) // 2
            
            # Find matching item
            matched_item = None
            for item in floor.get('items', []):
                name_clean = re.sub(r'[^a-z0-9]', '', item.get('display_name', '').lower())
                code_clean = re.sub(r'[^a-z0-9]', '', item.get('room_code', '').lower())
                
                if t_clean == name_clean or t_clean == code_clean:
                    matched_item = item
                    break
            
            if matched_item:
                print(f"  Mapped [{text}] -> {matched_item['display_name']} ({matched_item['item_id']})")
                matched_item['bbox'] = {"min_x": min_x, "min_y": min_y, "max_x": max_x, "max_y": max_y}
                matched_item['x'] = cx
                matched_item['y'] = cy
                matched_item['center_x'] = cx
                matched_item['center_y'] = cy
                matched_item['label_x'] = cx
                matched_item['label_y'] = cy - 14
                matched_item['annotation_mode'] = 'point'
                matched_item['annotation_status'] = 'assigned'
                matched_item['source'] = 'auto_easyocr'
                
    with open(draft_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    # Also update backup
    try:
        backup = "data/map_drafts/delta_hotspots_draft.json"
        with open(backup, 'r', encoding='utf-8') as f:
            data2 = json.load(f)
        for floor2 in data2:
            f_num = floor2['floor']
            # find corresponding floor in data
            for floor in data['floors']:
                if floor['floor'] == f_num:
                    for item in floor.get('items', []):
                        for r2 in floor2.get('rooms', []):
                            if r2['item_id'] == item['item_id']:
                                r2.update({
                                    k: v for k, v in item.items() if k in [
                                        'bbox', 'x', 'y', 'center_x', 'center_y', 
                                        'label_x', 'label_y', 'annotation_mode', 
                                        'annotation_status', 'source'
                                    ]
                                })
        with open(backup, 'w', encoding='utf-8') as f:
            json.dump(data2, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Could not update backup:", e)
        
    print("Auto-mapping complete.")

if __name__ == '__main__':
    auto_map()
