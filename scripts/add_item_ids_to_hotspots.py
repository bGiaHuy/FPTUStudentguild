import json
import unicodedata
import re
import os

file_path = 'data/map_drafts/delta_hotspots_draft.json'

def normalize_string(s):
    s = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('utf-8')
    s = re.sub(r'[^a-zA-Z0-9]', '-', s).lower()
    return re.sub(r'-+', '-', s).strip('-')

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Ensure unique item_ids across the whole file
for floor_data in data:
    floor = floor_data.get('floor')
    counts = {}
    for room in floor_data.get('rooms', []):
        if 'item_id' not in room:
            code = room.get('room_code', 'unknown')
            norm_code = normalize_string(code)
            
            # keep track of counts to make it unique
            counts[norm_code] = counts.get(norm_code, 0) + 1
            idx = counts[norm_code]
            
            # Create a stable ID: DELTA-F{floor}-{norm_code}-{idx:02d}
            item_id = f"DELTA-F{floor}-{norm_code}-{idx:02d}"
            room['item_id'] = item_id

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Added stable item_id to all items in delta_hotspots_draft.json")
