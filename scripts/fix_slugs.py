import json
import os
import shutil

rename_map = {
    "fap-registration-giao-di-n-th-ng-g-p-m-c-n-y-01.png": "fap-registration-common-interface-01.png",
    "fap-admin-procedures-send-application-g-i-n-view-ap-02.png": "fap-admin-procedures-send-application-02.png",
    "fap-admin-procedures-xin-x-c-nh-n-sinh-vi-n-03.png": "fap-admin-procedures-student-confirmation-03.png",
    "fap-th-ng-tin-h-c-t-p-weekly-timetable-th-i-kh-a-bi--04.png": "fap-study-info-weekly-timetable-04.png",
    "fap-th-ng-tin-h-c-t-p-view-exam-schedule-xem-l-ch-th-05.png": "fap-study-info-exam-schedule-05.png",
    "fap-th-ng-tin-h-c-t-p-ti-p-theo-s-c-4-ph-n-n-i-dung--06.png": "fap-study-info-syllabus-guide-06.png",
    "fap-lookup-reports-attendance-report-b-o-c-o-i-m--07.png": "fap-lookup-reports-attendance-report-07.png",
    "fap-lookup-reports-mark-report-b-o-c-o-i-m-08.png": "fap-lookup-reports-mark-report-08.png",
    "fap-lookup-reports-academic-transcript-b-o-c-o-i--09.png": "fap-lookup-reports-academic-transcript-09.png"
}

folder_map = {
    "th-ng-tin-h-c-t-p": "study-info"
}

json_path = 'data/content/website_guides.todo.json'
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

base_dir = "frontend/public"

for item in data:
    if item.get("images"):
        new_images = []
        for img in item["images"]:
            # e.g. /content/website-guides/fap/th-ng-tin-h-c-t-p/fap-th-ng-tin-...04.png
            parts = img.split('/')
            basename = parts[-1]
            folder = parts[-2]
            
            new_basename = rename_map.get(basename, basename)
            new_folder = folder_map.get(folder, folder)
            
            parts[-1] = new_basename
            parts[-2] = new_folder
            
            new_img = "/".join(parts)
            new_images.append(new_img)
            
            # Move the file physically
            old_fs_path = os.path.join(base_dir, img.lstrip('/'))
            new_fs_path = os.path.join(base_dir, new_img.lstrip('/'))
            
            if os.path.exists(old_fs_path):
                os.makedirs(os.path.dirname(new_fs_path), exist_ok=True)
                shutil.move(old_fs_path, new_fs_path)
        
        item["images"] = new_images

# Also clean up old empty folders
for old_folder, new_folder in folder_map.items():
    old_dir = os.path.join(base_dir, "content/website-guides/fap", old_folder)
    if os.path.exists(old_dir) and not os.listdir(old_dir):
        os.rmdir(old_dir)

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Renaming completed.")
