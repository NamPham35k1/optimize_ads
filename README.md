# AUTO ADS CARE — HỆ THỐNG TỰ ĐỘNG QUẢN LÝ FACEBOOK ADS

> Hệ thống tự động giám sát, phân tích hiệu suất và tối ưu quảng cáo Facebook (Meta Marketing API) với trọng tâm là chiến dịch Tin nhắn (Click-to-Messenger). 
> Tự động phát hiện và tạm dừng các nhóm quảng cáo vượt ngưỡng chi phí, bảo vệ ngân sách quảng cáo với cơ chế an toàn đa tầng (Dry Run, Emergency Stop, Idempotency, Post-Action Verification).

---

## 1. TỔNG QUAN KIẾN TRÚC

Hệ thống được thiết kế theo kiến trúc module hóa phân tán, tách biệt giữa Web Server, Background Care Scheduler, Meta Marketing API Gateway và Data Storage:

```
┌───────────────────────────────────────────────────────────┐
│              FRONTEND (React + TS + Tailwind)            │
│  - Dashboard KPI & Biểu Đồ Recharts                       │
│  - Quản Lý Tài Khoản Ads & Kết Nối Meta API               │
│  - Danh Sách Chiến Dịch / AdSet / Ad (Cây dữ liệu)        │
│  - Rule Builder (Trung tâm thiết lập quy tắc tự động)     │
│  - Rule Simulator (Mô phỏng thử nghiệm trước khi bật)     │
│  - Automation Logs (Lịch sử audit chi tiết)               │
└──────────────┬────────────────────────────▲───────────────┘
               │ HTTP / REST API            │
               ▼                            │
┌───────────────────────────────────────────────────────────┐
│               BACKEND (Node.js + Express + TS)            │
│  - Authentication & AES-256 Token Encryption              │
│  - Controllers: Account, Campaign, Rule, Audit, System    │
│  - REST Endpoints & Error Boundary                        │
└──────┬──────────────────────┬──────────────────────┬──────┘
       │                      │                      │
       ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌─────────────────────────┐
│  PRISMA ORM  │      │ CARE ENGINE  │      │ META API INTEGRATION    │
│ (PostgreSQL/ │      │ - Scheduler  │      │ - Metric Resolver       │
│   SQLite)    │      │ - Matcher    │      │ - Graph API Client      │
│              │      │ - Evaluator  │      │ - Mock Mode Gateway     │
│              │      │ - Safety Mgr │      │ - Token Debugger        │
└──────────────┘      └──────────────┘      └─────────────────────────┘
```

---

## 2. CÁC TÍNH NĂNG CHÍNH

### A. Dashboard Phân Tích Hiệu Suất
- Hiển thị đầy đủ các KPI: Tổng chi tiêu hôm nay, tổng chi tiêu khoảng thời gian, tổng số tin nhắn, chi phí trung bình/tin nhắn (CPA), số chiến dịch đang chạy/tạm dừng, số đối tượng bị hệ thống tự động tắt, số đối tượng vượt ngưỡng.
- Biểu đồ trực quan bằng **Recharts**: Biểu đồ kết hợp Chi tiêu & Số tin nhắn, Biểu đồ xu hướng CPA theo thời gian so với ngưỡng mục tiêu.

### B. Quản Lý Tài Khoản Meta
- Kết nối thông qua Access Token chính thức của Meta Marketing API (`ads_read`, `ads_management`, `read_insights`).
- **Bảo mật tuyệt đối**: Không yêu cầu mật khẩu Facebook, Token được mã hóa AES-256-GCM ở backend và không bao giờ trả về frontend.
- Tự động phát hiện token hết hạn, thiếu quyền hoặc tài khoản bị vô hiệu hóa.
- Chuyển đổi linh hoạt giữa tài khoản Live thật và tài khoản **Mock Demo**.

### C. Quản Lý Chiến Dịch & Nhóm Quảng Cáo (Hierarchy View)
- Bảng dữ liệu dạng cây: Campaign ➔ Ad Set ➔ Ad.
- Cột chỉ số chính xác: Tên, ID, Trạng thái (Đang chạy, Tạm dừng, Hệ thống tự tắt), Chi tiêu, Số tin nhắn, Chi phí/tin nhắn, CPM, CPC, CTR.
- Bộ lọc theo trạng thái, tìm kiếm và sắp xếp theo chi phí.

### D. Rule Builder — Trung Tâm Thiết Lập Quy Tắc
- Tự do cấu hình quy tắc mà không cần sửa code:
  - **Phạm vi**: Campaign, Ad Set hoặc Ad.
  - **Đối tượng**: Tất cả đối tượng Active hoặc chỉ định cụ thể.
  - **Chỉ số giám sát**:
    - `COST_PER_MESSAGING`: Chi phí / cuộc trò chuyện tin nhắn mới.
    - `SPEND_WITHOUT_MESSAGES`: Chi tiêu vượt ngưỡng khi chưa có tin nhắn nào.
    - `CPM`, `CPC`, `CTR`, `TOTAL_SPEND`.
  - **Toán tử**: `>`, `>=`, `<`, `<=`.
  - **Số kết quả tối thiểu (`minResults`)**: Tránh tắt oan quảng cáo mới chạy chưa đủ dữ liệu thống kê.
  - **Số lần kiểm tra liên tiếp (`consecutiveViolationsRequired`)**: Xác nhận vi phạm bền vững trước khi hành động (ví dụ: vi phạm 2 lần liên tiếp).
  - **Chu kỳ kiểm tra**: 15 phút, 30 phút, 1 giờ, v.v.
  - **Hành động**: Tạm dừng (PAUSE) hoặc Chỉ gửi cảnh báo (NOTIFY_ONLY).

### E. Rule Simulator — Mô Phỏng Kiểm Thử
- Cho phép người dùng chạy thử quy tắc trên dữ liệu thực tế trước khi bật.
- Báo cáo rõ: Đối tượng nào sẽ bị ảnh hưởng, số liệu hiện tại, lý do quyết định, hành động dự kiến.
- Đảm bảo 100% không làm thay đổi trạng thái quảng cáo thật khi mô phỏng.

### F. Cơ Chế An Toàn Đa Tầng (Safety Rules)
1. **Mặc định Dry Run**: Mọi quy tắc mới tạo luôn ở chế độ Dry Run an toàn.
2. **Xác nhận kích hoạt Live Mode**: Yêu cầu xác nhận rõ ràng trước khi cho phép gửi lệnh ghi lên Meta API.
3. **Emergency Stop (Công tắc dừng khẩn cấp)**: Nút dừng khẩn cấp toàn cục trên Header; khi bật sẽ đóng băng lập tức 100% các hành vi tắt quảng cáo tự động.
4. **Idempotency & Pre-check**: Kiểm tra trạng thái đối tượng trên Meta trước khi gửi lệnh. Nếu đã PAUSED thì bỏ qua để tránh gọi API trùng lặp.
5. **Post-Action Verification**: Sau khi gửi lệnh tắt, re-query API để xác nhận trạng thái thực tế đã chuyển sang PAUSED. Nếu API thất bại, không báo thành công giả lập.
6. **Không tự bật lại quảng cáo**: Hệ thống chỉ tạm dừng để bảo toàn ngân sách; không tự tiện bật lại các quảng cáo đã tắt.
7. **Phân biệt trạng thái**: Đánh dấu rõ cờ `isPausedBySystem: true` để phân biệt đối tượng do tool tắt và đối tượng do người dùng chủ động tắt trên Ads Manager.

---

## 3. CÔNG NGHỆ SỬ DỤNG

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Node.js 22, Express, TypeScript, Prisma ORM, node-cron.
- **Bảo mật**: Node Crypto (`aes-256-gcm`, SHA-256).
- **Cơ sở dữ liệu**: SQLite (Zero-config local run) & PostgreSQL ready.
- **Kiểm thử**: Vitest (13 tests bao quát Unit & Safety).
- **Deployment**: Docker, Docker Compose, Nginx.

---

## 4. HƯỚNG DẪN CÀI ĐẶT & CHẠY LOCAL

### Yêu Cầu Môi Trường
- Node.js >= 20.x (Đã kiểm thử trên Node v22.20.0)
- npm >= 10.x

### Bước 1: Cài đặt Dependencies
Từ thư mục gốc dự án:
```bash
npm install
```

### Bước 2: Khởi tạo Cơ Sở Dữ Liệu
```bash
npm run prisma:generate
npm run prisma:migrate
```

### Bước 3: Khởi chạy Ứng Dụng (Cả Backend & Frontend)
Chỉ cần chạy lệnh sau để khởi động song song cả 2 dịch vụ:
```bash
npm run dev
```

Hoặc chạy riêng từng phần nếu muốn:
```bash
# Terminal 1: Backend (Chạy tại port 5000)
npm run dev:backend

# Terminal 2: Frontend (Chạy tại port 3000)
npm run dev:frontend
```

Truy cập giao diện Web tại: **`http://localhost:3000`**  
Backend Healthcheck: **`http://localhost:5000/health`**

---

## 5. HƯỚNG DẪN CHẠY TEST

Dự án bao gồm bộ test toàn diện kiểm tra tính toán chi phí tin nhắn, điều kiện đánh giá, bảo mật token và cơ chế an toàn Emergency Stop:

```bash
npm run test
```

Kết quả:
```
✓ tests/metric-resolver.test.ts (4 tests)
✓ tests/condition-matcher.test.ts (4 tests)
✓ tests/encryption.test.ts (3 tests)
✓ tests/action-executor.test.ts (2 tests)

Test Files  4 passed (4)
Tests       13 passed (13)
```

---

## 6. HƯỚNG DẪN TRIỂN KHAI VỚI DOCKER

Dự án đã có sẵn cấu hình `docker-compose.yml`, `Dockerfile.backend` và `Dockerfile.frontend`:

```bash
# Tạo file môi trường từ mẫu
cp backend/.env.example .env

# Khởi động cụm container
docker-compose up -d --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

---

## 7. CẤU HÌNH TÍCH HỢP META MARKETING API THẬT

1. Truy cập [Meta for Developers](https://developers.facebook.com/apps/) và tạo ứng dụng loại **Business**.
2. Thêm sản phẩm **Marketing API**.
3. Điền các biến vào file `backend/.env`:
   ```env
   META_APP_ID=your_app_id
   META_APP_SECRET=your_app_secret
   META_API_VERSION=v22.0
   ```
4. Lấy User Access Token có quyền:
   - `ads_read`
   - `ads_management`
   - `read_insights`
5. Mở tab **"Tài Khoản Ads"** trên giao diện, bấm **"Kết Nối Tài Khoản Thật (Live)"** và dán token. Hệ thống sẽ tự động xác thực qua `/debug_token`, tải danh sách tài khoản quảng cáo và bắt đầu giám sát an toàn.

---

## 8. BẢNG TRẠNG THÁI TÍNH NĂNG

| Tính Năng | Trạng Thái | Ghi Chú |
|:---|:---:|:---|
| Dashboard KPIs & Biểu đồ Recharts | ✅ Hoạt động | Đầy đủ chi tiêu, tin nhắn, CPA, xu hướng 7 ngày |
| Quản lý tài khoản & Chuyển đổi Live / Mock | ✅ Hoạt động | Sẵn sàng cả Mock và Live Token |
| Bảng chiến dịch phân cấp (Campaign ➔ AdSet ➔ Ad) | ✅ Hoạt động | Hiển thị chi tiêu, tin nhắn, CPA, CPM, CPC, CTR |
| Rule Builder tùy biến mọi điều kiện | ✅ Hoạt động | Hỗ trợ chi phí tin nhắn, 0 tin nhắn, CPM, CPC |
| Rule Simulator mô phỏng trước khi áp dụng | ✅ Hoạt động | Test rule an toàn trên dữ liệu hiện tại |
| Background Scheduler (Worker độc lập) | ✅ Hoạt động | Tự động chạy chu kỳ kiểm tra định kỳ |
| Emergency Stop (Dừng khẩn cấp toàn cục) | ✅ Hoạt động | Đóng băng ngay tức khắc mọi lệnh ghi API |
| Mã hóa AES-256 Token ở Database | ✅ Hoạt động | Token không bao giờ lộ về frontend |
| Bộ kiểm thử Unit & Integration Tests | ✅ Hoạt động | 13/13 tests passed |
