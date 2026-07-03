import csv
import sys
import glob
import json

def validate_csv_file(filepath):
    print(f"Validating {filepath}...")
    filename = filepath.split('/')[-1].split('\\')[-1]
    is_room_metadata = filename.startswith("room_metadata")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        if not headers:
            print(f"[ERROR] {filepath} is empty or missing headers.")
            return False
            
        required_cols = ["review_status", "published", "verified_by", "verified_at"]
        for col in required_cols:
            if col not in headers:
                print(f"[ERROR] {filepath} is missing required column '{col}'.")
                return False

        has_errors = False
        row_num = 1
        for row in reader:
            row_num += 1
            review_status = row.get("review_status", "").strip()
            published = row.get("published", "").strip().lower() in ["true", "1", "yes"]
            verified_by = row.get("verified_by", "").strip()
            verified_at = row.get("verified_at", "").strip()
            source_name = row.get("source_name", "").strip()
            source_url = row.get("source_url", "").strip()
            
            # 1. review_status checks
            if review_status not in ["draft", "needs_review", "verified"]:
                print(f"  [ERROR] Row {row_num}: Invalid review_status '{review_status}'. Must be draft, needs_review, or verified.")
                has_errors = True
                
            # 2. published checks
            if published:
                if review_status != "verified":
                    print(f"  [ERROR] Row {row_num}: published is true but review_status is '{review_status}'. Must be 'verified'.")
                    has_errors = True
                if not verified_by:
                    print(f"  [ERROR] Row {row_num}: published is true but 'verified_by' is empty.")
                    has_errors = True
                if not verified_at:
                    print(f"  [ERROR] Row {row_num}: published is true but 'verified_at' is empty.")
                    has_errors = True
                    
            # 3. Source check
            if not source_name and not source_url:
                print(f"  [WARNING] Row {row_num}: Source is missing (both source_name and source_url are empty).")
                
            # 4. Room metadata specific checks
            if is_room_metadata:
                desc = row.get("description", "").strip()
                hours = row.get("opening_hours", "").strip()
                contact = row.get("contact", "").strip()
                photos = row.get("photos", "").strip()
                
                has_extra = bool(desc) or bool(hours) or bool(contact) or bool(photos)
                if has_extra and not verified_by:
                    print(f"  [WARNING] Row {row_num}: Room metadata has description/opening_hours/contact/photos but no 'verified_by' signature.")

    return not has_errors

def validate_json_file(filepath):
    print(f"Validating {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"[ERROR] {filepath} is not valid JSON: {e}")
            return False
            
    if not isinstance(data, list):
        print(f"[ERROR] {filepath} must contain a JSON array of items.")
        return False
        
    has_errors = False
    required_cols = ["review_status", "published", "verified_by", "verified_at"]
    
    for row_num, row in enumerate(data, 1):
        for col in required_cols:
            if col not in row:
                print(f"  [ERROR] Item {row_num}: missing required field '{col}'.")
                has_errors = True
                
        review_status = str(row.get("review_status", "")).strip()
        published = row.get("published", False)
        if isinstance(published, str):
            published = published.lower() in ["true", "1", "yes"]
        verified_by = str(row.get("verified_by", "")).strip()
        verified_at = str(row.get("verified_at", "")).strip()
        
        # 1. review_status checks
        if review_status not in ["draft", "needs_review", "verified"]:
            print(f"  [ERROR] Item {row_num}: Invalid review_status '{review_status}'. Must be draft, needs_review, or verified.")
            has_errors = True
            
        # 2. published checks
        if published:
            if review_status != "verified":
                print(f"  [ERROR] Item {row_num}: published is true but review_status is '{review_status}'. Must be 'verified'.")
                has_errors = True
            if not verified_by:
                print(f"  [ERROR] Item {row_num}: published is true but 'verified_by' is empty.")
                has_errors = True
            if not verified_at:
                print(f"  [ERROR] Item {row_num}: published is true but 'verified_at' is empty.")
                has_errors = True

    return not has_errors

if __name__ == "__main__":
    csv_files = glob.glob("data/content/*.todo.csv")
    json_files = glob.glob("data/content/*.todo.json")
    target_files = csv_files + json_files
    
    if not target_files:
        print("No .todo.csv or .todo.json files found in data/content/")
        sys.exit(0)
        
    all_passed = True
    for f in target_files:
        if f.endswith(".csv"):
            if not validate_csv_file(f):
                all_passed = False
        elif f.endswith(".json"):
            if not validate_json_file(f):
                all_passed = False
            
    if all_passed:
        print("\nAll files PASSED strict validation. Check above for any [WARNING]s.")
    else:
        print("\nValidation FAILED due to strict rule violations.")
        sys.exit(1)
