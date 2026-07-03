---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 7cea322cf7c584557d31710ecddbcd34_febf2a5b730011f1b2f55254006c9bbf
    ReservedCode1: dmoBiZz/mOk1aNc4KufAva8wM/8yq8C+XRFWErhb6MdVm6GkrVeVUayFpdCeckfnCiR4EppJSVDCNMLMfMKEduF53/l33BAgs5Icvgp1sqWWmkx0XUqTRWmBq6d46YAnIcZArHycjePX1noWNVT86Hx7IuBsewVIqTxNkOUO4O3vvO42AEhM3uQAMF0=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 7cea322cf7c584557d31710ecddbcd34_febf2a5b730011f1b2f55254006c9bbf
    ReservedCode2: dmoBiZz/mOk1aNc4KufAva8wM/8yq8C+XRFWErhb6MdVm6GkrVeVUayFpdCeckfnCiR4EppJSVDCNMLMfMKEduF53/l33BAgs5Icvgp1sqWWmkx0XUqTRWmBq6d46YAnIcZArHycjePX1noWNVT86Hx7IuBsewVIqTxNkOUO4O3vvO42AEhM3uQAMF0=
---

# Delta Map — Handoff Package for Antigravity

**Generated:** 2026-06-28
**Status:** ⚠️ Draft — Auto-prefill, 0 items human-reviewed

---

## Files in This Package

| File | Description |
|------|-------------|
| `delta_map_annotations_autoprefill.json` | Full 4-floor nested JSON with all 180 items and metadata |
| `delta_map_production_candidate_draft.json` | Cleaned format ready for frontend/backend wiring |
| `delta_map_asset_manifest.json` | Floor image paths, dimensions, preview overlay paths |
| `delta_map_counts.md` | Item counts per floor, status breakdown, duplicate report |
| `preview_paths.md` | Exact paths to all 4 floor preview overlay images |
| `README.md` | This file |

---

## Current State

- **180 items** total across 4 floors (F1: 30, F2: 43, F3: 53, F4: 54)
- **180 items** have auto-prefilled bounding boxes
- **0 items** human-reviewed
- **All items** marked `needs_human_review` unless already reviewed
- **All item_ids** are unique: Yes
- Source: `auto_uniform_grid_prefill` from calibrated uniform grid

---

## Important: Do NOT Ship to Production Yet

This data is **auto-prefilled** — bounding boxes were generated algorithmically from a
uniform grid calibration. While visual QA shows good alignment across all 4 floors,
**every item must be visually reviewed** before replacing the production map data.

Current production map likely uses a different dataset / coordinate system.
Swapping wholesale without review will break existing navigation and search.

---

## Classification Rules

### `???` Items (2 items, F2)

`???` is an **intentional map label** from the source — it represents real rooms/areas
whose labels are "???" in the original floor plan. Treat these as:

- `item_type`: `room`
- `is_clickable`: `true`
- `is_searchable`: `true`
- `review_status`: `needs_human_review`

They should appear in the user-facing map just like any other room.

### `tường` Items (2 items, F2 row 17)

`tường` means "wall" in Vietnamese. These are **structural elements**, not rooms:

- `item_type`: `wall`
- `is_clickable`: `false`
- `is_searchable`: `false`
- `review_status`: `structural_reference`
- `public_facing`: `false`

Hide these from user search, click interactions, and navigation.
They exist in the draft for reference only.

---

## Suggested Next Steps for Antigravity

1. **Read this README first**, then `delta_map_counts.md`
2. **Visual QA** using the overlay preview images listed in `preview_paths.md`
3. **Add image-background map mode** — render floor images as map background
4. **Render bbox overlays** using `production_candidate_draft.json`
5. **Filter user-facing items** — only show items where `is_clickable=true` and `is_searchable=true`
6. **Show review warning** — if `review_required=true`, display a visual indicator that the bounding box is auto-generated and needs human verification
7. **Use the React annotation tool** at `/tools/delta-map-annotation` to visually review and correct boxes before finalizing
8. **Export reviewed JSON** from the annotation tool to replace `production_candidate_draft.json`

---

## Floor Images

Public path: `/mapping/floor{1-4}.png`

| Floor | Resolution | Source |
|-------|-----------|--------|
| 1 | 2600×1600 | New high-res image |
| 2 | 2412×1760 | New high-res image |
| 3 | 2422×1687 | New high-res image |
| 4 | 2380×1760 | New high-res image |

Images are already placed in `frontend/public/mapping/` and served by Vite.

---

## Warnings

- **0 of 180 items human-reviewed.** Auto-prefill bboxes cover the full floor plan
  but may have small positional errors at room edges, especially for narrow corridors.
- **Duplicate display names** exist (e.g. "Cầu thang" = stairs appears on multiple
  floors). The annotation tool handles this with (trái)/(phải)/(trên)/(dưới) suffixes.
  When building the user-facing map, you may need similar disambiguation.
- **`???` is NOT missing data** — do not hide or remove these items.
- **`tường` must NOT appear** in the user-facing map — they are structural references only.
*（内容由AI生成，仅供参考）*
