import cv2
import json
import numpy as np
import easyocr
import re
import os

reader = easyocr.Reader(['en', 'vi'])

def extract_text_from_roi(img, x, y, w, h):
    roi = img[y:y+h, x:x+w]
    # Resize to make OCR more accurate
    roi = cv2.resize(roi, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    results = reader.readtext(roi)
    texts = [res[1].lower().strip() for res in results]
    return " ".join(texts)

def find_room_bboxes(image_path):
    img = cv2.imread(image_path)
    if img is None:
        return []
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # The image is colored rectangles on white/beige background
    # Let's use edge detection or thresholding.
    # Inverse binary threshold: everything not white becomes white
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
    
    # Morphological operations to close small gaps inside the colored blocks
    kernel = np.ones((5,5), np.uint8)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bboxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        
        # Filter by size. Rooms are typically > 30x30 and < 500x500
        # The whole map is 2048x1489
        if w > 40 and h > 30 and w < 600 and h < 600:
            # We can also check solidity to ensure it's a rectangle
            hull = cv2.convexHull(cnt)
            hull_area = cv2.contourArea(hull)
            if hull_area > 0:
                solidity = float(cv2.contourArea(cnt)) / hull_area
                if solidity > 0.8: # fairly rectangular
                    # Extract text
                    text = extract_text_from_roi(img, x, y, w, h)
                    bboxes.append({
                        "bbox": {"min_x": x, "min_y": y, "max_x": x+w, "max_y": y+h},
                        "text": text,
                        "cx": x + w//2,
                        "cy": y + h//2
                    })
    return bboxes

def auto_map():
    draft_path = "frontend/public/data/delta_draft.json"
    with open(draft_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for floor in data['floors']:
        f_num = floor['floor']
        img_path = f"frontend/public/mapping/floor{f_num}vs2.jpg"
        print(f"Processing Floor {f_num}...")
        
        extracted = find_room_bboxes(img_path)
        print(f"Found {len(extracted)} potential rooms")
        
        # We will match based on text
        for ext in extracted:
            t = ext['text']
            t_clean = re.sub(r'[^a-z0-9]', '', t)
            
            # Find matching item
            matched_item = None
            for item in floor.get('items', []):
                # Try exact match on name
                name_clean = re.sub(r'[^a-z0-9]', '', item.get('display_name', '').lower())
                code_clean = re.sub(r'[^a-z0-9]', '', item.get('room_code', '').lower())
                
                if t_clean and (t_clean == name_clean or t_clean == code_clean):
                    matched_item = item
                    break
            
            if matched_item:
                print(f"  Mapped [{t}] -> {matched_item['display_name']} ({matched_item['item_id']})")
                matched_item['bbox'] = ext['bbox']
                matched_item['x'] = ext['cx']
                matched_item['y'] = ext['cy']
                matched_item['center_x'] = ext['cx']
                matched_item['center_y'] = ext['cy']
                matched_item['label_x'] = ext['cx']
                matched_item['label_y'] = ext['cy'] - 14
                matched_item['annotation_mode'] = 'rectangle'
                matched_item['annotation_status'] = 'assigned'
                matched_item['source'] = 'auto_ocr'
                
    with open(draft_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print("Auto-mapping complete.")

if __name__ == '__main__':
    auto_map()
