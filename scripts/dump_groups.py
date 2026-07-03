import json
with open('data/content/website_guides.todo.json', encoding='utf-8') as f:
    data = json.load(f)
websites = set(g['website'] for g in data)
groups = set(g['group'] for g in data)
print("Websites:", websites)
print("Groups:", groups)
