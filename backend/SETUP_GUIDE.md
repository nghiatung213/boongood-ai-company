# Hướng dẫn triển khai Layer 2 Backend (Supabase + Gemini + Cloud Run)

Backend được thiết kế theo hướng **Chatbot-First** (0 token khi nhàn rỗi, Cloud Run tự ngủ về 0 khi không dùng). Bạn chỉ cần làm lần lượt **4 bước ngắn** dưới đây:

---

## Bước 1: Lấy Gemini API Key (Miễn phí)

1. Truy cập **Google AI Studio**: https://aistudio.google.com/apikey
2. Đăng nhập tài khoản Google → bấm **Create API key** → chọn project (hoặc tạo mới).
3. Sao chép chuỗi khóa (`AIza...`) lưu tạm vào ghi chú cá nhân. Đây là biến **`GEMINI_API_KEY`**.

---

## Bước 2: Khởi tạo Database trên Supabase (Miễn phí)

1. Truy cập https://supabase.com → đăng nhập → bấm **New project** (đặt tên ví dụ `boongood-ai`, chọn region gần Việt Nam như **Singapore**).
2. Chờ khoảng 1–2 phút để project khởi tạo xong.
3. Ở thanh menu bên trái, bấm **SQL Editor** → **New query**.
4. Mở file `backend/supabase_schema.sql` trong repository này, **copy toàn bộ nội dung**, dán vào khung SQL Editor rồi bấm **Run**.
   - Khi thấy `Success. No rows returned` là xong!
   - Vào mục **Table Editor → agents** kiểm tra sẽ thấy đủ **6 nhân vật Friends** (`rachel`, `monica`, `chandler`, `ross`, `joey`, `phoebe`) đều ở chế độ mặc định `PASSIVE` và trạng thái `IDLE`.
5. Vào biểu tượng bánh răng **Project Settings → API** và sao chép 2 giá trị:
   - **Project URL** (`https://xxxx.supabase.co`) → dùng làm **`SUPABASE_URL`**
   - **`service_role` secret key** (bấm *Reveal* để copy) → dùng làm **`SUPABASE_SERVICE_ROLE_KEY`** *(giữ bí mật tuyệt đối, không chia sẻ công khai)*.

---

## Bước 3: Deploy lên Google Cloud Run (Scale-to-Zero, không tốn phí khi rảnh)

### Cách A — Nhanh nhất bằng giao diện Google Cloud Console (không cần gõ lệnh)
1. Truy cập https://console.cloud.google.com/run → bấm **Create Service**.
2. Chọn **Continuously deploy from a repository (GitHub)** → bấm **Set up with Cloud Build** → chọn repo `nghiatung213/boongood-ai-company`, nhánh `main`.
3. Ở mục **Build Configuration**:
   - Build Type: **Dockerfile**
   - Source location: `/backend/Dockerfile`
4. Cấu hình dịch vụ:
   - **Region:** `asia-southeast1` (Singapore — gần Việt Nam, phản hồi nhanh)
   - **Authentication:** chọn **Allow unauthenticated invocations** *(bảo mật API đã được khóa bằng `BACKEND_API_KEY`)*
   - **Minimum number of instances:** **`0`** *(đảm bảo 0 chi phí & 0 token khi không sử dụng)*
   - **Container port:** `8080`
5. Mở mục **Variables & Secrets → Environment Variables**, thêm các biến theo `backend/.env.example`:
   - `GEMINI_API_KEY` = *(khóa ở Bước 1)*
   - `GEMINI_MODEL_PASSIVE` = `gemini-3.5-flash-lite`
   - `GEMINI_MODEL_AUTONOMOUS` = `gemini-3.8-flash`
   - `SUPABASE_URL` = *(URL ở Bước 2)*
   - `SUPABASE_SERVICE_ROLE_KEY` = *(service_role key ở Bước 2)*
   - `BRIDGE_URL` = *(link `/exec` đã test thành công ở Giai đoạn 1)*
   - `BRIDGE_SECRET` = *(khóa `API_SECRET` từ Apps Script Giai đoạn 1)*
   - `BACKEND_API_KEY` = *(tự đặt 1 mật khẩu bí mật bất kỳ để khóa API, ví dụ `bg_ceo_2026_secret`)*
6. Bấm **Create** → chờ khoảng 2 phút → bạn sẽ nhận được URL dịch vụ dạng `https://boongood-backend-xxxx.a.run.app`.

### Cách B — Chạy thử ngay trên máy cá nhân (tùy chọn)
```bash
cd backend
cp .env.example .env
# Mở file .env và điền đầy đủ khóa của bạn
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

---

## Bước 4: Test thử ngay trên trình duyệt (Không cần viết code!)

1. Mở đường dẫn: **`<CLOUD_RUN_URL>/docs`** (hoặc `http://localhost:8080/docs` nếu chạy máy cá nhân).
2. Nếu bạn có đặt `BACKEND_API_KEY`: ở mỗi endpoint bấm **Try it out** và điền khóa vào ô **`X-API-Key`**.
3. Thử lần lượt 3 trải nghiệm chính:
   - **Chat kèm ảnh với Rachel (`POST /api/chat`):** chọn `multipart/form-data`, nhập `agent_id = rachel`, gõ câu hỏi góp ý thiết kế, chọn 1 tấm ảnh sản phẩm ở ô `image` rồi bấm **Execute** → xem câu trả lời + số `tokens_used`.
   - **Lưu góp ý hay vào Google Drive với 0 token (`POST /api/chat/save-to-drive`):** copy `assistant_message_id` từ kết quả trên, dán vào `message_id` → bấm **Execute** → mở Google Drive thư mục `00_Inbox_Drafts` sẽ thấy ngay file Google Docs định dạng sạch!
   - *(Tùy chọn mở rộng)* **Bật chế độ tự chủ cho Ross (`PATCH /api/agents/ross/mode`):** đổi `mode` sang `AUTONOMOUS`, sau đó giao việc qua `POST /api/tasks` và duyệt qua `POST /api/tasks/{task_id}/review`.
