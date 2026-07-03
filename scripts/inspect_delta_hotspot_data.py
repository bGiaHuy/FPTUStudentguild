import json
import pandas as pd
import os

file_path = '../mapping/MAPPING DELTA.xlsx'
hotspot_out = 'data/map_drafts/delta_hotspots_draft.json'
nav_out = 'data/map_drafts/delta_navigation_graph_draft.json'

os.makedirs('data/map_drafts', exist_ok=True)

floor_mapping = {
    'Tầng 1': {'num': 1, 'img': 'floor1.png', 'w': 1122, 'h': 689},
    'Tấng 2': {'num': 2, 'img': None, 'w': 0, 'h': 0},
    'Tầng 3': {'num': 3, 'img': 'floor3.png', 'w': 2048, 'h': 1426},
    'Tầng 4': {'num': 4, 'img': None, 'w': 0, 'h': 0},
}

try:
    xls = pd.ExcelFile(file_path)
    
    hotspots = []
    
    for sheet_name in xls.sheet_names:
        if sheet_name not in floor_mapping:
            continue
        
        f_info = floor_mapping[sheet_name]
        df = pd.read_excel(xls, sheet_name=sheet_name)
        
        rooms = []
        for row_idx, row in df.iterrows():
            for col_idx, value in enumerate(row):
                if pd.notna(value) and str(value).strip() != '':
                    code = str(value).strip()
                    # We leave x and y as 0 initially so human can edit. 
                    # If it's 0,0 we can skip rendering in preview.
                    # Or we could provide a rough guess, but user said "do not guess blindly".
                    rooms.append({
                        "room_code": code,
                        "x": 0,
                        "y": 0,
                        "label_x": 0,
                        "label_y": 0,
                        "click_radius": 20,
                        "source": "manual_hotspot",
                        "confidence": "needs_review"
                    })
                    
        # Add a couple of dummy/demo coordinates for proof of concept preview
        if f_info['num'] == 1 and len(rooms) > 0:
            rooms[0]['x'] = 500
            rooms[0]['y'] = 300
            rooms[0]['label_x'] = 500
            rooms[0]['label_y'] = 320
            
        if f_info['num'] == 3 and len(rooms) > 0:
            rooms[0]['x'] = 1000
            rooms[0]['y'] = 700
            rooms[0]['label_x'] = 1000
            rooms[0]['label_y'] = 720
            
        hotspots.append({
            "floor": f_info['num'],
            "image": f_info['img'],
            "image_width": f_info['w'],
            "image_height": f_info['h'],
            "rooms": rooms
        })
        
    with open(hotspot_out, 'w', encoding='utf-8') as f:
        json.dump(hotspots, f, ensure_ascii=False, indent=2)
        
    # Generate dummy navigation graph
    nav_graph = [
        {
            "floor": 1,
            "nodes": [
                {"id": "F1_CORRIDOR_01", "x": 500, "y": 400, "type": "corridor"},
                {"id": "F1_STAIRS_A", "x": 600, "y": 400, "type": "stairs"}
            ],
            "edges": [
                {"from": "F1_CORRIDOR_01", "to": "F1_STAIRS_A", "type": "walkable"}
            ],
            "room_connections": []
        },
        {
            "floor": 3,
            "nodes": [
                {"id": "F3_CORRIDOR_01", "x": 1000, "y": 800, "type": "corridor"}
            ],
            "edges": [],
            "room_connections": []
        }
    ]
    with open(nav_out, 'w', encoding='utf-8') as f:
        json.dump(nav_graph, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully created {hotspot_out} and {nav_out}")
except Exception as e:
    print("Error:", e)
