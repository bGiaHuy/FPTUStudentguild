import json
import os
from PIL import Image, ImageDraw

def generate_guide(calibration_file, out_file):
    if not os.path.exists(calibration_file):
        return
        
    with open(calibration_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    img_path = data['image']
    if not os.path.exists(img_path):
        print(f"Image not found: {img_path}")
        return
        
    img = Image.open(img_path).convert('RGBA')
    draw = ImageDraw.Draw(img)
    
    # Draw vertical lines
    for x in data['x_lines']:
        draw.line([(x, 0), (x, data['image_height'])], fill="yellow", width=2)
        
    # Draw horizontal lines
    for y in data['y_lines']:
        draw.line([(0, y), (data['image_width'], y)], fill="yellow", width=2)
        
    img.save(out_file)
    print(f"Saved guide: {out_file}")

if __name__ == '__main__':
    os.makedirs('data/map_drafts/previews', exist_ok=True)
    generate_guide('data/map_drafts/calibration/floor1_calibration.json', 'data/map_drafts/previews/floor1_calibration_guide.png')
    generate_guide('data/map_drafts/calibration/floor3_calibration.json', 'data/map_drafts/previews/floor3_calibration_guide.png')
