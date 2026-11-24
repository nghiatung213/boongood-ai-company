# Hướng dẫn triển khai Workspace Bridge (Google Apps Script)

Tài liệu này hướng dẫn từng bước triển khai file `workspace-bridge/Code.gs` lên Google Apps Script và kiểm thử đầy đủ 4 hành động bằng `workspace-bridge/test_bridge.py`.

---

## Bước 1: Tạo dự án Google Apps Script mới

1. Đăng nhập tài khoản Google (tài khoản Google Drive muốn chứa thư mục `Boongood_AI_Company`) và truy cập: https://script.google.com
2. Nhấn **New project** (Dự án mới).
3. Đổi tên dự án ở góc trên bên trái thành **`Boongood_Workspace_Bridge`**.
4. Mở file `Code.gs` mặc định, xóa toàn bộ nội dung mẫu và dán toàn bộ mã nguồn từ file `workspace-bridge/Code.gs` trong repository này vào.
5. Nhấn **Ctrl + S** (hoặc **Cmd + S**) để lưu lại.

---

## Bước 2: Chạy `setupWorkspace()` lần đầu và cấp quyền

1. Trên thanh công cụ phía trên trình soạn thảo, chọn hàm **`setupWorkspace`** trong danh sách hàm cạnh nút **Run**.
2. Nhấn **Run** (Chạy).
3. Google sẽ hiện hộp thoại yêu cầu cấp quyền (**Authorization required**):
   - Nhấn **Review permissions** -> chọn tài khoản Google của bạn.
   - Nếu xuất hiện cảnh báo *"Google hasn't verified this app"*: nhấn **Advanced** (Nâng cao) -> chọn **Go to Boongood_Workspace_Bridge (unsafe)**.
   - Nhấn **Allow** (Cho phép) để cấp quyền truy cập Google Drive, Google Docs và Google Sheets.
4. Quan sát khung **Execution log** ở bên dưới: khi thấy dòng `=== BOONGOOD WORKSPACE SETUP COMPLETE ===` là thành công.
5. Mở Google Drive kiểm tra đã xuất hiện thư mục **`Boongood_AI_Company`** gồm:
   - `00_Inbox_Drafts`
   - `01_Market_Research`
   - `02_Prototypes_Drafts`
   - `03_Data_Calculations`
   - File Google Sheets **`Boongood_Master_Ledger`** với 3 tab (`Tasks_Log`, `Market_Data`, `Finance_Models`).

> **Lưu ý:** Toàn bộ Folder ID và Sheet ID đã được tự động lưu vào `Script Properties` — bạn **không cần** copy/điền tay bất kỳ ID nào.

---

## Bước 3: Lấy hoặc tùy chỉnh `API_SECRET`

1. Ở thanh menu bên trái của Google Apps Script, chọn biểu tượng bánh răng **Project Settings** (Cài đặt dự án).
2. Kéo xuống mục **Script Properties** (Thuộc tính tập lệnh).
3. Bạn sẽ thấy các khóa đã được tạo sẵn:
   - `ROOT_FOLDER_ID`
   - `FOLDER_INBOX_ID`
   - `FOLDER_MARKET_RESEARCH_ID`
   - `FOLDER_PROTOTYPES_ID`
   - `FOLDER_DATA_CALC_ID`
   - `MASTER_SHEET_ID`
   - `API_SECRET` *(được tự sinh ngẫu nhiên dạng `bg_...`)*
4. Sao chép giá trị của **`API_SECRET`** để dùng ở Bước 5 (hoặc nhấn **Edit script properties** nếu bạn muốn đặt chuỗi bí mật riêng của mình). **Không đưa khóa này lên GitHub.**

---

## Bước 4: Deploy thành Web App

1. Ở góc trên bên phải, nhấn **Deploy** -> **New deployment** (Triển khai mới).
2. Nhấn biểu tượng bánh răng cạnh mục *Select type* -> chọn **Web app** (Ứng dụng web).
3. Điền cấu hình:
   - **Description:** `Boongood Workspace Bridge v1`
   - **Execute as:** **Me** *(chạy bằng tài khoản của bạn để ghi vào Drive/Sheets của bạn)*
   - **Who has access:** **Anyone** *(để Cloud Run ở Giai đoạn 2 và script kiểm thử gọi được HTTP POST; bảo mật được kiểm soát bằng `API_SECRET`)*
4. Nhấn **Deploy**.
5. Sao chép **Web app URL** (có dạng `https://script.google.com/macros/s/.../exec`).
6. *(Tùy chọn)* Mở thử Web app URL trên trình duyệt: nếu trả về JSON `{"ok": true, "service": "Boongood Workspace Bridge", ...}` nghĩa là cầu nối đã sẵn sàng.

> **Quan trọng khi chỉnh sửa `Code.gs` sau này:** Mỗi lần bạn sửa mã trong `Code.gs`, bản Web App cũ **không tự cập nhật**. Bạn cần vào **Deploy -> Manage deployments -> nhấn biểu tượng bút chì (Edit) -> Version: New version -> Deploy** để kích hoạt thay đổi mà vẫn giữ nguyên URL cũ.

---

## Bước 5: Chạy kiểm thử bằng `test_bridge.py`

1. Cài thư viện `requests` (nếu máy chưa có):
   ```bash
   pip install requests
   ```
2. Gán 2 biến môi trường `BRIDGE_URL` và `BRIDGE_SECRET` rồi chạy script:

   **Trên Linux / macOS:**
   ```bash
   export BRIDGE_URL="https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec"
   export BRIDGE_SECRET="<GIA_TRI_API_SECRET>"
   python3 workspace-bridge/test_bridge.py
   ```

   **Trên Windows (PowerShell):**
   ```powershell
   $env:BRIDGE_URL="https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec"
   $env:BRIDGE_SECRET="<GIA_TRI_API_SECRET>"
   python workspace-bridge/test_bridge.py
   ```

3. Khi thấy thông báo `=== TẤT CẢ 4/4 HÀNH ĐỘNG ĐỀU THÀNH CÔNG ===`, hãy mở các link Drive/Sheets được in ra để kiểm tra:
   - Báo cáo test đã nằm trong `01_Market_Research`.
   - Prototype HTML đã nằm trong `02_Prototypes_Drafts`.
   - Tab `Tasks_Log` có 2 dòng với cột `Status = APPROVED` và nội dung `CEO_Feedback`.
   - Tab `Market_Data` và `Finance_Models` mỗi tab có thêm 2 dòng dữ liệu mẫu.

---

## Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân & Cách khắc phục |
| :--- | :--- |
| `Phản hồi không phải JSON hợp lệ` (trả về trang HTML đăng nhập Google) | Mục **Who has access** khi Deploy chưa đặt là **Anyone**, hoặc bạn dùng nhầm URL `/dev` thay vì `/exec`. |
| `Unauthorized: invalid API_SECRET` | Biến môi trường `BRIDGE_SECRET` không khớp với `API_SECRET` trong **Project Settings -> Script Properties**. |
| `Missing ScriptProperty "FOLDER_INBOX_ID"` | Chưa chạy hàm `setupWorkspace()` ở Bước 2. |
| Sửa `Code.gs` nhưng gọi API vẫn thấy hành vi cũ | Cần cập nhật **New version** trong **Deploy -> Manage deployments**. |
