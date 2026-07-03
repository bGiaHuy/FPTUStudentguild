import json
import os
from PIL import Image, ImageDraw, ImageFont

raw_grid_path = 'data/map_drafts/raw_parsed_grid.json'
report_path = 'data/map_drafts/review_report.md'
previews_dir = 'data/map_drafts/previews'

with open(raw_grid_path, 'r', encoding='utf-8') as f:
    grid_data = json.load(f)

report_lines = ["# Delta Mapping Calibrated Review Report\n"]

floor_mapping = {
    'Tầng 1': {'num': 1, 'img': '../mapping/floor1.png', 'calib': 'data/map_drafts/calibration/floor1_calibration.json'},
    'Tấng 2': {'num': 2, 'img': None, 'calib': None},
    'Tầng 3': {'num': 3, 'img': '../mapping/floor3.png', 'calib': 'data/map_drafts/calibration/floor3_calibration.json'},
    'Tầng 4': {'num': 4, 'img': None, 'calib': None},
}

all_draft_rooms = 0
all_skipped_rooms = 0

for sheet_name, sheet_info in grid_data.items():
    if sheet_name not in floor_mapping:
        continue
    f_info = floor_mapping[sheet_name]
    f_num = f_info['num']
    f_img = f_info['img']
    f_calib = f_info['calib']
    
    rooms = sheet_info['rooms']
    
    report_lines.append(f"## Floor {f_num} ({sheet_name})")
    report_lines.append(f"- **Detected items in XLSX:** {len(rooms)}")
    
    if f_img and f_calib and os.path.exists(f_img) and os.path.exists(f_calib):
        with open(f_calib, 'r', encoding='utf-8') as cf:
            calib_data = json.load(cf)
            
        x_lines = calib_data['x_lines']
        y_lines = calib_data['y_lines']
            
        img = Image.open(f_img).convert('RGBA')
        draw = ImageDraw.Draw(img)
        
        draft_items = []
        for r in rooms:
            code = str(r['room_code'])
            col_idx = r['col_idx']
            row_idx = r['row_idx']
            
            # Bound check
            if col_idx < len(x_lines) - 1 and row_idx < len(y_lines) - 1:
                x1 = x_lines[col_idx]
                x2 = x_lines[col_idx + 1]
                y1 = y_lines[row_idx]
                y2 = y_lines[row_idx + 1]
                
                center_x = (x1 + x2) / 2
                center_y = (y1 + y2) / 2
                
                # Draw semi-transparent rectangle
                draw.rectangle([x1, y1, x2, y2], outline="red", width=2, fill=(255, 0, 0, 50))
                draw.text((center_x - 10, center_y - 10), code, fill="blue")
                
                draft_items.append(code)
                all_draft_rooms += 1
            else:
                report_lines.append(f"  - WARNING: Room {code} at row {row_idx}, col {col_idx} exceeds calibration lines!")
            
        img.save(os.path.join(previews_dir, f'floor{f_num}_calibrated_overlay.png'))
        
        report_lines.append(f"- **Generated draft rooms:** {len(draft_items)}")
        report_lines.append(f"- **Preview Saved:** `data/map_drafts/previews/floor{f_num}_calibrated_overlay.png`\n")
        
    else:
        # Missing image
        report_lines.append(f"- **Official Image:** MISSING")
        report_lines.append(f"- **Generated draft rooms:** 0 (Skipped)\n")
        all_skipped_rooms += len(rooms)

report_lines.append("## Overall Summary")
report_lines.append(f"- **Total Draft Rooms Generated (with geometry):** {all_draft_rooms}")
report_lines.append(f"- **Total Rooms Skipped (missing floorplan):** {all_skipped_rooms}")

with open(report_path, 'w', encoding='utf-8') as f:
    f.write("\n".join(report_lines))
    
print("Successfully generated calibrated previews and review report.")
