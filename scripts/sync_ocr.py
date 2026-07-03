import json

d1_path = 'frontend/public/data/delta_draft.json'
d2_path = 'data/map_drafts/delta_floors_vs2.json'

with open(d1_path, 'r', encoding='utf-8') as f:
    d1 = json.load(f)
with open(d2_path, 'r', encoding='utf-8') as f:
    d2 = json.load(f)

count = 0
for floor1 in d1['floors']:
    for floor2 in d2['floors']:
        if floor1['floor'] == floor2['floor_number']:
            for item1 in floor1.get('items', []):
                if item1.get('annotation_status') == 'assigned':
                    for item2 in floor2.get('items', []):
                        r1 = str(item1.get('room_code', '')).replace('.0', '').lower().strip()
                        r2 = str(item2.get('room_code', '')).replace('.0', '').lower().strip()
                        
                        if r1 and r2 and r1 == r2:
                            b = item1.get('bbox', {})
                            if b:
                                item2['bbox'] = {
                                    'x1': b.get('min_x', item2['bbox']['x1']),
                                    'y1': b.get('min_y', item2['bbox']['y1']),
                                    'x2': b.get('max_x', item2['bbox']['x2']),
                                    'y2': b.get('max_y', item2['bbox']['y2'])
                                }
                                item2['polygon'] = [
                                    [item2['bbox']['x1'], item2['bbox']['y1']],
                                    [item2['bbox']['x2'], item2['bbox']['y1']],
                                    [item2['bbox']['x2'], item2['bbox']['y2']],
                                    [item2['bbox']['x1'], item2['bbox']['y2']]
                                ]
                            item2['center'] = {
                                'x': item1.get('center_x', item2['center']['x']),
                                'y': item1.get('center_y', item2['center']['y'])
                            }
                            item2['review_status'] = 'auto-mapped-ocr'
                            count += 1
                            break

with open(d2_path, 'w', encoding='utf-8') as f:
    json.dump(d2, f, ensure_ascii=False, indent=2)

print(f'Updated {count} items in delta_floors_vs2.json')
