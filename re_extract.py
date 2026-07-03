import mammoth
import markdownify
import os
import json
import re

docx_path = "temp_docx.zip"
# Create a dummy image handler that just returns the sequential image names since they are already saved.
image_counter = 0
def custom_image_handler(image):
    global image_counter
    image_counter += 1
    file_extension = image.content_type.split("/")[1]
    file_name = f"image_{image_counter}.{file_extension}"
    return {"src": f"/assets/huong-dan-thi-cu/{file_name}"}

with open(docx_path, "rb") as docx_file:
    result = mammoth.convert_to_html(docx_file, convert_image=mammoth.images.img_element(custom_image_handler))
    html = result.value

md = markdownify.markdownify(html, heading_style="ATX")

sections = re.split(r'\n# ', '\n' + md)
sections = [s.strip() for s in sections if s.strip()]

items = []
for section in sections:
    lines = section.split('\n')
    title_line = lines[0]
    if title_line.startswith('============================='):
        continue
    
    title = title_line.strip()
    body = '\n'.join(lines[1:]).strip()
    
    # Do NOT strip images from body. Just find them to populate the 'images' array for fallback.
    images = re.findall(r'!\[.*?\]\((.*?)\)', body)
    
    # Extract links: [text](url) -> text (url) but ignore images ![]()
    body = re.sub(r'(?<!\!)\[(.*?)\]\((.*?)\)', r'\1 (\2)', body)
    
    # Clean up other markdown like ##, **, *
    body = re.sub(r'^##\s+(.*)', r'\1', body, flags=re.MULTILINE)
    body = re.sub(r'^###\s+(.*)', r'\1', body, flags=re.MULTILINE)
    body = re.sub(r'\*\*(.*?)\*\*', r'\1', body) # bold
    body = re.sub(r'\*(.*?)\*', r'\1', body) # italic or bold
    
    # Remove excessive newlines
    body = re.sub(r'\n{3,}', '\n\n', body)
    
    item = {
        "website": "Hướng dẫn thi cử",
        "group": "Quy chế & Phần mềm thi",
        "title": title,
        "instructions": body.strip(),
        "images": images,
        "review_status": "verified",
        "published": True,
        "verified_by": "System",
        "verified_at": "2026-07-03T00:00:00Z"
    }
    items.append(item)

json_path = 'data/content/website_guides.todo.json'
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Remove the old items
titles = ["SEB: Safe Exam Browser", "PEA:", "EOS:", "USB:", "Nội quy thi cử:"]
data = [item for item in data if not (item.get('website') == 'Hướng dẫn thi cử' and item.get('title') in titles)]

# Append new items
data.extend(items)

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Re-extracted and saved {len(items)} items to json with inline images.")
