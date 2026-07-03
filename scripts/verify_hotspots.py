import json

file_path = 'data/map_drafts/delta_hotspots_draft.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

total = 0
assigned = 0
unassigned = 0
assigned_by_floor = {}

suspicious = []
seen_coords = {}

for floor in data:
    f_num = floor['floor']
    img_w = floor.get('image_width', 0)
    img_h = floor.get('image_height', 0)
    has_img = floor.get('image') is not None
    
    floor_assigned = 0
    
    for room in floor['rooms']:
        total += 1
        x = room.get('x', 0)
        y = room.get('y', 0)
        code = room.get('room_code', '')
        src = room.get('source', '')
        conf = room.get('confidence', '')
        
        if not code:
            suspicious.append(f"Floor {f_num}: Room missing room_code")
            
        if x > 0 or y > 0:
            assigned += 1
            floor_assigned += 1
            
            if not has_img:
                suspicious.append(f"Floor {f_num}, Room {code}: assigned coordinate but floor has no image")
                
            if img_w > 0 and (x < 0 or x > img_w):
                suspicious.append(f"Floor {f_num}, Room {code}: X {x} is outside image bounds (width {img_w})")
            if img_h > 0 and (y < 0 or y > img_h):
                suspicious.append(f"Floor {f_num}, Room {code}: Y {y} is outside image bounds (height {img_h})")
                
            coord_key = f"{f_num}_{x}_{y}"
            if coord_key in seen_coords:
                suspicious.append(f"Floor {f_num}, Room {code}: exact duplicate coordinates with Room {seen_coords[coord_key]}")
            else:
                seen_coords[coord_key] = code
                
            if src != "manual_hotspot":
                suspicious.append(f"Floor {f_num}, Room {code}: incorrect source '{src}'")
            if "human" not in conf and "review" not in conf:
                suspicious.append(f"Floor {f_num}, Room {code}: suspicious confidence '{conf}'")
        else:
            unassigned += 1
            
    assigned_by_floor[f_num] = floor_assigned

print(f"TOTAL_ROOMS={total}")
print(f"ASSIGNED={assigned}")
print(f"UNASSIGNED={unassigned}")
for f, c in assigned_by_floor.items():
    print(f"ASSIGNED_F{f}={c}")

print("SUSPICIOUS_START")
for s in suspicious:
    print(s)
print("SUSPICIOUS_END")
