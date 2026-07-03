import json

with open('data/content/website_guides.todo.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find the target group name
target_group = None
for item in data:
    if 'L' in item['group'] and 'tr' in item['group'] and '&' in item['group']:
        target_group = item['group']
        break

if not target_group:
    print("Group not found!")
    exit(1)

# Remove all items in the target group
new_data = [item for item in data if item['group'] != target_group]

# Add the 8 new items
items_to_add = [
    {
        "title": "Register extra courses (Đăng ký môn học đi chậm kỳ)",
        "instructions": """* Dùng để đăng ký những môn học bắt buộc như VOVINAM (võ 1, võ 2, võ 3) và nhạc cụ truyền thống.

[Giao diện web nhà trường]

<strong style="color:var(--color-primary);">Cơ sở:</strong> Chọn cơ sở bạn đang theo học.

<strong style="color:var(--color-primary);">Mã Môn học:</strong> Nhập mã môn cần đăng ký (VD: VOV124, VOV134,...) → (nhớ tick vào ô vuông bên cạnh).

<strong style="color:var(--color-primary);">Lớp:</strong> Lớp học hiện đang có để đăng ký.

<strong style="color:var(--color-primary);">Thời gian học:</strong> Tùy thuộc vào thời gian của sinh viên, hãy chọn khung giờ học phù hợp.

→ Sau khi chọn xong ấn thanh toán và SAVE.

<span style="color:var(--color-warning); font-weight:bold; background-color:var(--color-warning-soft); padding:4px 8px; border-radius:4px; display:inline-block;">* LƯU Ý : Làm thủ tục trước 1 tuần của kỳ học mới.</span>"""
    },
    {
        "title": "Register to improve mark (Đăng ký học cải thiện điểm)",
        "instructions": """* Dùng để đăng ký những môn học bản thân muốn học lại để cải thiện điểm số, tăng GPA trung bình.

[Giao diện web nhà trường]

<strong style="color:var(--color-primary);">Cơ sở:</strong> Chọn cơ sở bạn đang theo học.

<strong style="color:var(--color-primary);">Mã Môn học:</strong> Nhập mã môn cần đăng ký (VD: CSD203, DBI202,...) → (nhớ tick vào ô vuông bên cạnh).

<strong style="color:var(--color-primary);">Lớp:</strong> Lớp học hiện đang có để đăng ký (Lưu ý lớp cải thiện sẽ được mở theo thời gian cố định).

<strong style="color:var(--color-primary);">Thời gian học:</strong> Tùy thuộc vào thời gian của sinh viên, hãy chọn khung giờ học phù hợp.

→ Sau khi chọn xong ấn thanh toán và SAVE.

<span style="color:var(--color-warning); font-weight:bold; background-color:var(--color-warning-soft); padding:4px 8px; border-radius:4px; display:inline-block;">* LƯU Ý : Làm thủ tục trước 1 tuần của kỳ học mới.</span>"""
    },
    {
        "title": "Register to repeat a course (Đăng ký học lại)",
        "instructions": """* Dùng để đăng ký những môn học bản thân chưa pass ở những kỳ trước, đây sẽ là nơi đăng ký để trả nợ những môn bản thân đã trượt.

[Giao diện web nhà trường]

<strong style="color:var(--color-primary);">Cơ sở:</strong> Chọn cơ sở bạn đang theo học.

<strong style="color:var(--color-primary);">Mã Môn học:</strong> Nhập mã môn cần đăng ký (VD: CSD203, DBI202,...) → (nhớ tick vào ô vuông bên cạnh).

<strong style="color:var(--color-primary);">Lớp:</strong> Lớp học hiện đang có để đăng ký (Lưu ý lớp học lại sẽ được mở theo thời gian cố định).

<strong style="color:var(--color-primary);">Thời gian học:</strong> Tùy thuộc vào thời gian của sinh viên, hãy chọn khung giờ học phù hợp.

→ Sau khi chọn xong thanh toán và SAVE

(Sinh viên đăng ký học lại ngay trong kỳ hoặc trong kỳ tiếp theo được áp dụng phí học lại bằng 50% biểu phí môn)

<span style="color:var(--color-warning); font-weight:bold; background-color:var(--color-warning-soft); padding:4px 8px; border-radius:4px; display:inline-block;">* LƯU Ý : làm thủ tục trước 1 tuần của kỳ học mới.</span>"""
    },
    {
        "title": "Register Free Elective Courses (Đăng ký môn tự chọn)",
        "instructions": """* Dùng để đăng ký những môn tự chọn (khi bạn check những môn học ở kỳ tiếp theo và thấy mã môn là ELECTIVE thì kỳ đó bạn sẽ phải đăng ký một môn tự chọn).

→ Đăng ký chỉ áp dụng với người có môn ELECTIVE ở kỳ đó."""
    },
    {
        "title": "Wishlist Course (Danh sách các môn học chờ lớp) | Register wishlist (Đăng ký)",
        "instructions": """* Chứa danh sách các môn chờ được xếp lớp ở kỳ tiếp theo.

→ Nếu kỳ tới bạn học 5 môn sẽ hiển thị ở đây danh sách chờ của 5 môn đó nếu cá nhân bạn muốn hủy hoặc tạm dừng môn học nào sẽ chỉ nhận được ½ số tiền bạn đã đăng ký học."""
    },
    {
        "title": "Đăng ký học vượt kỳ",
        "instructions": """* Dùng để đăng ký học vượt những môn ở kỳ tiếp theo nếu bản thân cảm thấy hoàn toàn đủ kiến thức để đẩy nhanh tiến độ theo khung chương trình:

<div style="color:var(--color-warning); font-weight:bold; background-color:var(--color-warning-soft); padding:8px; border-radius:4px; margin-top:8px;">
# Lưu ý:

* Sinh viên học kỳ <0 hoặc 5,6,9 không được phép đăng ký.
* Chỉ được phép đăng ký học vượt môn của kỳ +1 (VD: đang học kỳ 2 thì chỉ được vượt môn của kỳ 3).
* Sinh viên chỉ tự đăng ký 2 môn học vượt kỳ.
* Sinh viên cần cân nhắc kỹ trước khi đăng ký học vượt kỳ. Trong trường hợp chương trình đào tạo thay đổi, môn học vượt bị thay thế bằng môn khác thì sinh viên cần bổ sung học môn thay thế và học phí học thừa môn.
</div>"""
    },
    {
        "title": "Đăng ký học phụ đạo",
        "instructions": """* Dùng để đăng ký học thêm, bổ trợ những môn mà bản thân đang hổng kiến thức."""
    },
    {
        "title": "Đăng ký học môn học tại nước ngoài",
        "instructions": """* Dùng để đăng ký học những môn ngoại ngữ tại nước ngoài, giúp các bạn sinh viên vừa được học lại vừa được khám phá những nền văn hóa khác nhau.

[Giao diện web nhà trường]

<strong style="color:var(--color-primary);">Cơ sở:</strong> Chọn cơ sở bạn đang theo học.

<strong style="color:var(--color-primary);">Mã Môn học:</strong> Nhập mã môn cần đăng ký (VD: TRS601,...) → (nhớ tick vào ô vuông bên cạnh).

<strong style="color:var(--color-primary);">Lớp:</strong> Lớp học hiện đang có để đăng ký (Lưu ý lớp sẽ được mở theo thời gian cố định).

<strong style="color:var(--color-primary);">Thời gian học:</strong> Tùy thuộc vào thời gian của sinh viên, hãy chọn khung giờ, thời điểm học phù hợp.

→ Sau khi chọn xong ấn thanh toán và SAVE."""
    }
]

# Find where to insert them (at the end or in place)
# Let's just append them
for item in items_to_add:
    new_data.append({
        "website": "FAP",
        "group": target_group,
        "title": item["title"],
        "instructions": item["instructions"],
        "images": [],
        "review_status": "needs_review",
        "published": False,
        "verified_by": "",
        "verified_at": ""
    })

with open('data/content/website_guides.todo.json', 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False, indent=2)

print("Done writing 8 items.")
