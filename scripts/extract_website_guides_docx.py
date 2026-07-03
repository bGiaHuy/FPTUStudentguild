import os
import json
import shutil
import re
from docx import Document

DOCX_PATH = r"flow3_rawdata\Mô tả website nhà trường (data luồng 3).docx"
OUT_JSON = r"data\content\website_guides.todo.json"
IMG_DIR = r"frontend\public\content\website-guides"

# Clear old extracted images
if os.path.exists(IMG_DIR):
    shutil.rmtree(IMG_DIR)

os.makedirs(IMG_DIR, exist_ok=True)
os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)

def safe_filename(name):
    name = re.sub(r'[^a-zA-Z0-9]+', '-', name.lower())
    return name.strip('-')

doc = Document(DOCX_PATH)

current_website = "FAP" # Default to FAP as per DOCX context
current_group = "Chung"
current_item = None

guides = []
image_counter = 1

def slugify_group(group_name):
    gn = group_name.lower()
    if "đăng ký thủ tục" in gn: return "academic-services"
    if "tra cứu" in gn or "báo cáo" in gn: return "lookup-reports"
    if "thanh toán" in gn or "giao dịch" in gn: return "finance-transactions"
    if "nội quy" in gn or "hỗ trợ" in gn: return "rules-support"
    if "đăng ký" in gn: return "registration"
    if "hành chính" in gn: return "admin-procedures"
    return safe_filename(group_name)[:30]

def slugify_website(ws_name):
    return safe_filename(ws_name)

def add_guide_text(text):
    if not text.strip(): return
    if current_item:
        current_item["instructions"].append(text)

for p in doc.paragraphs:
    text = p.text.strip()
    
    # Try to extract images from this paragraph
    for r in p.runs:
        if 'graphic' in r._element.xml:
            for xml_elem in r._element.iter():
                if xml_elem.tag.endswith('blip'):
                    embed_id = xml_elem.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                    if embed_id:
                        part = doc.part.related_parts[embed_id]
                        img_bytes = part.blob
                        ext = part.content_type.split('/')[-1]
                        if ext == 'jpeg': ext = 'jpg'
                        
                        if current_item and current_website:
                            website_slug = slugify_website(current_website)
                            group_slug = slugify_group(current_group)
                            
                            ws_dir = os.path.join(IMG_DIR, website_slug, group_slug)
                            os.makedirs(ws_dir, exist_ok=True)
                            
                            item_slug = safe_filename(current_item["title"])[:30]
                            if not item_slug: item_slug = "image"
                            img_name = f"{website_slug}-{group_slug}-{item_slug}-{image_counter:02d}.{ext}"
                            
                            img_path = os.path.join(ws_dir, img_name)
                            with open(img_path, 'wb') as f:
                                f.write(img_bytes)
                            
                            rel_path = f"/content/website-guides/{website_slug}/{group_slug}/{img_name}"
                            current_item["images"].append(rel_path)
                            image_counter += 1

    if not text:
        continue
        
    style_name = p.style.name.lower()
    
    # Heuristics for headings
    if "FAP" in text.upper() and len(text) < 20: 
        current_website = "FAP"
        current_group = "Chung"
        current_item = None
    elif "FLM" in text.upper() and len(text) < 20: 
        current_website = "FLM"
        current_group = "Chung"
        current_item = None
    elif "CMS" in text.upper() and len(text) < 20: 
        current_website = "CMS"
        current_group = "Chung"
        current_item = None
    elif "EDUNEXT" in text.upper() and len(text) < 20: 
        current_website = "Edunext"
        current_group = "Chung"
        current_item = None
    elif "heading 1" in style_name or text.startswith("I. ") or text.startswith("II. ") or text.startswith("III. ") or text.startswith("IV. "):
        # It's a Major Group
        current_group = text
        current_item = None
    elif "heading 2" in style_name or "heading 3" in style_name or re.match(r'^\d+\.\s', text):
        # Could be subgroup, we'll append to current_group or treat as group
        current_group = text.lstrip("0123456789. ")
        current_item = None
    elif ":" in text and len(text.split(":")[0]) < 60 and not text.startswith("-"):
        item_title = text.split(":")[0].strip()
        current_item = {
            "website": current_website,
            "group": current_group,
            "title": item_title,
            "instructions": [text],
            "images": [],
            "review_status": "needs_review",
            "published": False,
            "verified_by": "",
            "verified_at": ""
        }
        guides.append(current_item)
    else:
        if current_item:
            add_guide_text(text)
        else:
            current_item = {
                "website": current_website,
                "group": current_group,
                "title": "Thông tin chung",
                "instructions": [text],
                "images": [],
                "review_status": "needs_review",
                "published": False,
                "verified_by": "",
                "verified_at": ""
            }
            guides.append(current_item)

for g in guides:
    g["instructions"] = "\n".join(g["instructions"])

with open(OUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(guides, f, ensure_ascii=False, indent=2)

print("Extraction complete.")
print(f"Number of guide items: {len(guides)}")
