import json
with open('data/content/website_guides.todo.json', encoding='utf-8') as f:
    data = json.load(f)

with open('scripts/mapping_output.txt', 'w', encoding='utf-8') as out:
    for item in data:
        if item.get("images"):
            for img in item["images"]:
                out.write(f"- Image Path: `{img}`\n")
                out.write(f"  - Website: {item['website']}\n")
                out.write(f"  - Group: {item['group']}\n")
                out.write(f"  - Guide Item Title: {item['title']}\n")
