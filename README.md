# 🗺️ FPTU Student Guide

> 🌐 **Live Demo (Website):** [https://fptu-studentguild.vercel.app/](https://fptu-studentguild.vercel.app/)

> 🚀 **Hệ sinh thái chuyển đổi số toàn diện dành cho sinh viên Đại học FPT**

FPTU Student Guide không chỉ là một ứng dụng bản đồ thông thường. Đây là một nền tảng kết hợp **Hệ thống dẫn đường trong nhà (Indoor Navigation)** siêu tối ưu, **Cổng thông tin sinh viên** và **AI Chatbot** thông minh để giải quyết mọi bài toán di chuyển và tìm kiếm thông tin trong khuôn viên trường.

---

## ✨ Tính năng nổi bật (Core Features)

- 🧭 **Multi-Floor Grid Pathfinding (V2 Engine)**: Hệ thống tìm đường thông minh đa tầng.
  - Lõi thuật toán **Theta* trên cấu trúc lưới (Grid-based)** cho đường đi tự nhiên, mượt mà (Line-of-Sight).
  - Tích hợp nội suy **Supercover Bresenham** kết hợp Penalty Costs để đường đi luôn ưu tiên giữa hành lang, chặn đứng hiện tượng "cắt góc xuyên tường".
  - Định tuyến tự động qua cầu thang/thang máy tối ưu khi người dùng cần di chuyển giữa các tầng.
  - Tính toán siêu tốc trên **Web Worker** với Binary Min-Heap và Bitwise operations, 0-blocking render.
- 🏢 **Interactive 2D Campus Map**: Bản đồ trường học số hóa cực chi tiết với tính năng Zoom, Pan, Hotspot Overlay và Click-to-Route.
- 🤖 **AI Assistant**: Trợ lý ảo tích hợp trực tiếp, giải đáp ngay lập tức các thắc mắc về phòng ban, luật lệ, thủ tục hành chính.
- 🔐 **SSO Authentication**: Đăng nhập 1-chạm bằng tài khoản Google (FPTU Email) an toàn và tiện lợi.

---

## 🛠️ Kiến trúc hệ thống (Tech Stack)

- **Frontend**: React.js + Vite + Zustand (State Management)
- **Backend**: FastAPI + Python (Hiệu năng cao, tương tác AI)
- **Database**: PostgreSQL + PostGIS (Spatial data) + Supabase
- **Pathfinding Engine**: Cấu trúc dữ liệu nguyên thủy (`Uint8Array`) và RLE Compression cho bản đồ vật lý.

---

## 🚀 Local Development Setup

### 1. Database Setup
Hệ thống sử dụng PostgreSQL tích hợp PostGIS. File `docker-compose.yml` đã được cấu hình sẵn.

1. Hãy chắc chắn bạn đã cài đặt [Docker](https://docs.docker.com/get-docker/).
2. Chạy lệnh sau để khởi động Database:
   ```bash
   docker-compose up -d
   ```
3. Database sẽ khả dụng tại `localhost:5432` với:
   - User: `postgres`
   - Password: `postgres`
   - DB Name: `fptu_guide`

> Đừng quên thiết lập file `.env` với chuỗi kết nối khớp với config trên.

### 2. Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Active venv (Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --reload
uvicorn main:app --reload

```

### 3. Frontend (React/Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 🤝 Contribution
Nếu bạn là sinh viên Đại học FPT và muốn cải thiện trải nghiệm số của trường, hãy tạo Pull Request hoặc mở Issue. Mọi ý tưởng từ việc tối ưu thuật toán tìm đường đến việc bổ sung dữ liệu bản đồ đều được chào đón!
