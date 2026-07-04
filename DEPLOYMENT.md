# Hướng dẫn Deploy hệ thống (Frontend + Backend + Database)

Dự án này đã được cấu hình sẵn sàng để deploy lên môi trường Production với stack:
- **Frontend**: Vercel (React + Vite)
- **Backend**: Render (Python FastAPI)
- **Database**: Supabase (PostgreSQL + pgvector)

Dưới đây là các bước chi tiết để deploy hệ thống của bạn.

---

## 1. Deploy Database (Supabase)

1. Đăng ký/Đăng nhập tại [Supabase](https://supabase.com).
2. Tạo một Project mới.
3. Khi Project được tạo thành công, vào phần **Settings -> Database**.
4. Lấy chuỗi kết nối **Transaction pooler** (để dùng cho Backend) với format:
   ```
   postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
5. Vào phần **Settings -> API**.
6. Lấy `Project URL` và `anon` `public` key (để dùng cho Frontend).
7. (Tùy chọn) Database sẽ được backend tự động tạo các bảng và bật extension `pgvector` khi backend khởi động lần đầu.

---

## 2. Deploy Backend (Render)

Repo đã tích hợp sẵn file `render.yaml` ở thư mục gốc để cấu hình CI/CD trên Render.

1. Đăng ký/Đăng nhập tại [Render](https://render.com).
2. Chọn **New + -> Blueprint**.
3. Kết nối với repo GitHub chứa source code này.
4. Render sẽ tự động đọc file `render.yaml` và nhận diện một Web Service tên là `fptu-student-guide-backend`.
5. Điền các **Environment Variables** (biến môi trường) khi Render yêu cầu (hoặc trong phần Environment sau khi tạo xong):
   - `DATABASE_URL`: Điền URI Supabase lấy ở bước 1.
   - `SUPABASE_URL`: Điền Project URL của Supabase.
   - `SUPABASE_JWT_SECRET`: Điền JWT Secret của Supabase (Settings -> API -> JWT Secret).
   - `GROQ_API_KEY`: API Key lấy từ Groq.
   - `CORS_ORIGINS`: URL của Frontend (sẽ có sau khi deploy Vercel, hoặc điền `*` để mở tạm thời).
   - `APP_ENV`: `production`
6. Nhấn **Apply / Deploy**. Render sẽ cài đặt các thư viện trong `backend/requirements.txt` và khởi chạy server với `uvicorn`.

Lấy URL backend sau khi deploy thành công (ví dụ: `https://fptu-student-guide-backend.onrender.com`).

---

## 3. Deploy Frontend (Vercel)

Thư mục `frontend/` đã là một Vite project chuẩn chỉnh.

1. Đăng ký/Đăng nhập tại [Vercel](https://vercel.com).
2. Nhấn **Add New... -> Project** và chọn repo GitHub này.
3. Tại phần **Configure Project**:
   - Mở mục **Root Directory** -> Bấm **Edit** và chọn thư mục `frontend`.
   - Vercel sẽ tự nhận diện Framework Preset là **Vite**.
4. Mở mục **Environment Variables** và thêm:
   - `VITE_API_URL`: Điền URL của Backend lấy từ Render (ví dụ: `https://fptu-student-guide-backend.onrender.com/api`).
   - `VITE_SUPABASE_URL`: Điền Project URL của Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Điền `anon` key của Supabase.
5. Nhấn **Deploy**.

*Lưu ý: File `frontend/vercel.json` đã cấu hình Rewrite cho React Router để khi F5/Reload trang không bị lỗi 404.*

---

## 4. Kiểm tra hệ thống

1. Mở trang web Frontend bằng URL được Vercel cấp.
2. Update ngược lại URL của frontend vào biến `CORS_ORIGINS` trên Render backend để tăng cường bảo mật.
3. Test thử các tính năng: Bản đồ, Chatbot, Report để đảm bảo toàn bộ luồng Frontend -> Backend -> Database hoạt động trơn tru.
