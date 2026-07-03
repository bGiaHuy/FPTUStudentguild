# Content Editors Guide

Welcome to the FPTU Student Guide content repository. As a human editor (guild/team member), you are responsible for filling in the official information that powers our Information Portal, FAQ, chatbot, and map metadata.

## Core Rules
* **Fill only information you know or can verify.** Do not guess.
* **Leave unknown info blank.** (e.g., use empty cells or `TODO_HUMAN_FILL`).
* **Source & Reviewer:** Put source details (`source_name`, `source_url`) and reviewer info (`verified_by`, `verified_at`) whenever possible.
* **Publishing:** Do NOT mark `published=true` unless `review_status=verified` and you have provided your name in `verified_by`.
* **Map Data Constraints:** Do NOT edit `data/delta_floors.json` manually. Use `room_metadata.todo.csv` to add descriptions and opening hours to existing map identifiers.

## Validation process
The project developers have set up scripts (`scripts/validate_content.py`) that will automatically reject invalid files or fake content.
* Only rows with `review_status=verified` and `published=true` will be imported into the database and shown to users.
* If a map room has a description, contact, opening hours, or photos, it **must** have a human `verified_by` signature.

## Allowed Categories for Articles
If you are adding an article to `articles.todo.csv`, please use one of the following categories:
* `exam_guide`
* `learning_tools`
* `admin_services`
* `campus_life`
