# Content Generation and Validation Guidelines

## General Rule (No Fake Content)
For the Information Portal, FAQ, chatbot knowledge, academic procedures, exam guides, scholarship rules, administrative processes, and official school guidance:
* **Do not invent content.**
* Humans / team / guild must fill or verify the information.
* AI may only create templates, validation rules, import workflows, and TODO placeholders.

## Special Rule for Map Data
AI is allowed to fill map-related fields **ONLY** when the information already exists in verified project data or uploaded source files.

### Allowed Map Sources:
* `data/delta_floors.json`
* Existing database seed data
* Uploaded Excel mapping files
* User-provided floor plan images
* Manually confirmed decisions already provided by the user
* Existing verified room/item metadata in the repository

### Map Fields AI May Fill (if source exists):
* `room_code`
* `item_id`
* `floor`
* `source_range`
* `bbox`
* `polygon`
* `item_type`
* `linked_room_code`
* `searchable`
* `highlightable`
* `needs_human_confirmation`
* `aliases` (if already present)
* `display_name` (if already confirmed)
* `note` (if already confirmed)

### Map Fields AI Must NOT Invent:
* room function
* official department description
* opening hours
* phone number / contact
* service responsibility
* room photos
* official name (if not confirmed)
* whether a room is accessible / restricted
* anything not present in source data

## Missing Map Info Policy
* If the value is not present in source data, leave it as:
  * `null`
  * empty string `""`
  * empty array `[]`
  * or `review_status: "needs_review"`
* **Do not guess.**
* Add `needs_human_confirmation: true` when uncertain.
* Add a note explaining what is missing.

## Validation Requirements
* For official content, published items must be `verified`.
* For map metadata, source-backed identifiers may exist with `needs_review`.
* Room metadata with descriptions / opening hours / contact / photos must require human verification.
* Validation scripts will warn if a map item has description, contact, opening_hours, or photos, but `verified_by` is empty.
* Scripts must NOT modify `data/delta_floors.json` or map geometry. Pathfinding and `building_topology.json` remain untouched.
