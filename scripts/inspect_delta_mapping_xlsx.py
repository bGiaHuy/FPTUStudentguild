import pandas as pd
import json
import os
import math

file_path = '../mapping/MAPPING DELTA.xlsx'
out_path = 'data/map_drafts/raw_parsed_grid.json'

os.makedirs('data/map_drafts', exist_ok=True)

try:
    xls = pd.ExcelFile(file_path)
    
    result = {}
    
    for sheet_name in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name=sheet_name)
        rooms = []
        for row_idx, row in df.iterrows():
            for col_idx, value in enumerate(row):
                if pd.notna(value) and str(value).strip() != '':
                    rooms.append({
                        'room_code': str(value).strip(),
                        'row_idx': int(row_idx),
                        'col_idx': int(col_idx)
                    })
        result[sheet_name] = {
            'max_row': int(df.shape[0]),
            'max_col': int(df.shape[1]),
            'rooms': rooms
        }
        
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Successfully extracted rooms to {out_path}")
except Exception as e:
    print("Error parsing XLSX:", e)
