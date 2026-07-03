import json
import pandas as pd

def validate_map_data(draft_json_path, xlsx_path):
    print("Validating SVG traced map data against XLSX metadata...")
    # 1. Load draft JSON
    # 2. Extract all room codes generated from SVGs
    # 3. Load XLSX grid data
    # 4. Compare room codes:
    #    - Highlight missing rooms (in XLSX but not traced in SVG)
    #    - Highlight orphaned shapes (in SVG but not found in XLSX)
    # 5. Output a validation summary report.

if __name__ == '__main__':
    print("Validation script ready.")
