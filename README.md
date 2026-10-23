# 🛡️ AUTO ADS CARE — HỆ THỐNG TỰ ĐỘNG CANH & TỐI ƯU CHIẾN DỊCH FACEBOOK ADS

> **Giải pháp tự động hóa bảo vệ ngân sách quảng cáo Facebook (Meta Marketing API) 24/7.**  
> Tự động quét số liệu định kỳ, phát hiện và tạm dừng (Pause) các chiến dịch / nhóm quảng cáo vượt ngưỡng chi phí, chống đốt tiền vô ích với cơ chế an toàn đa tầng (Dry Run, Xác thực 2 bước, Emergency Stop).

---

## 📑 MỤC LỤC
1. [Tổng Quan & Cơ Chế Hoạt Động](#1-tổng-quan--cơ-chế-hoạt-động)
2. [Hướng Dẫn Khởi Chạy Nhanh (Local & Docker)](#2-hướng-dẫn-khởi-chạy-nhanh-local--docker)
3. [Hướng Dẫn Từng Bước Lấy Token Meta API](#3-hướng-dẫn-từng-bước-lấy-token-meta-api)
4. [Hướng Dẫn Kết Nối Tài Khoản Quảng Cáo](#4-hướng-dẫn-kết-nối-tài-khoản-quảng-cáo)
5. [Giải Thích Toàn Bộ Thông Số Cần Nhập (Rule Inputs)](#5-giải-thích-toàn-bộ-thông-số-cần-nhập-rule-inputs)
6. [3 Kịch Bản Thực Chiến Canh Mốc Khuyên Dùng](#6-3-kịch-bản-thực-chiến-canh-mốc-khuyên-dùng)
7. [Cơ Chế Tự Động Ngầm (Scheduler) & An Toàn](#7-cơ-chế-tự-động-ngầm-scheduler--an-toàn)
8. [Xử Lý Sự Cố Thường Gặp (Troubleshooting)](#8-xử-lý-sự-cố-thường-gặp-troubleshooting)
9. [Kiến Trúc Kỹ Thuật & Lệnh Dành Cho Developer](#9-kiến-trúc-kỹ-thuật--lệnh-dành-cho-developer)

---

## 1. TỔNG QUAN & CƠ CHẾ HOẠT ĐỘNG

### 🎯 Công cụ này giải quyết vấn đề gì?
Khi chạy quảng cáo Facebook (đặc biệt là dạng Tin nhắn Messenger), bạn thường gặp các rủi ro:
* Nhóm quảng cáo cắn cả trăm nghìn đồng nhưng **không ra bất kỳ tin nhắn nào** khi bạn bận việc hoặc đang ngủ.
* Giá mỗi tin nhắn (CPA) bị **đội lên quá cao** (gấp 2–3 lần bình thường) mà không kịp tắt thủ công.
* Facebook delay cập nhật số liệu dẫn đến việc tắt oan các nhóm quảng cáo tiềm năng.

### ⚙️ Cơ chế hoạt động của Tool
Tool đóng vai trò như một **"trợ lý canh camp 24/7"**:
```
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│       SỐ LIỆU TỪ FACEBOOK            │       │         MỐC BẠN CÀI TRONG TOOL       │
│  (Cứ mỗi 2-15 phút gọi API hỏi 1 lần)│       │          (Ngưỡng bạn chịu được)      │
│                                      │       │                                      │
│  Ví dụ Nhóm 1:                       │  VS   │  Ví dụ Quy tắc:                      │
│  - Tiêu hết: 120.000 VNĐ             │       │  - Tiêu > 100.000 VNĐ mà 0 tin nhắn  │
│  - Tin nhắn ra: 0 tin nhắn           │       │    => Lập tức TẮT (PAUSE)            │
└──────────────────────────────────────┘       └──────────────────────────────────────┘
                                  │
                                  ▼
                   Tool phát hiện: 120.000đ > 100.000đ
                   => Gửi lệnh sang Facebook: TẮT NGAY NHÓM 1!
```

---

## 2. HƯỚNG DẪN KHỞI CHẠY NHANH (LOCAL & DOCKER)

### Yêu Cầu Môi Trường
* **Node.js** >= 20.x (Khuyên dùng v20 hoặc v22)
* **npm** >= 10.x

### Chạy Trên Máy Tính (Local)

1. **Cài đặt thư viện dependencies:**
   ```bash
   npm install
   ```

2. **Khởi tạo cơ sở dữ liệu (SQLite tự động cấu hình):**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

3. **Khởi chạy cả Backend & Frontend cùng lúc:**
   ```bash
   npm run dev
   ```

4. **Truy cập ứng dụng:**
   * Giao diện Web: **`http://localhost:3000`**
   * Backend Healthcheck: **`http://localhost:5000/health`**

*(Hoặc nếu muốn chạy 2 terminal riêng biệt: `npm run dev:backend` tại port 5000 và `npm run dev:frontend` tại port 3000).*

### Chạy Bằng Docker (Nếu có Docker)
```bash
cp backend/.env.example .env
docker-compose up -d --build
```
* Web chạy tại: `http://localhost:3000`

---

## 3. HƯỚNG DẪN TỪNG BƯỚC LẤY TOKEN META API

> [!NOTE]
> Tool **không bao giờ yêu cầu mật khẩu Facebook** của bạn. Tool chỉ dùng chuỗi mã hóa **Meta Access Token** do chính Facebook cấp để thay mặt bạn đọc báo cáo và tắt quảng cáo vi phạm.

### Bước 1: Mở công cụ tạo Token chính thức của Facebook
1. Đăng nhập nick Facebook đang nắm quyền quản trị viên các tài khoản quảng cáo.
2. Mở trình duyệt và truy cập: **[Meta Graph API Explorer](https://developers.facebook.com/tools/explorer/)**
3. Nếu bạn chưa từng đăng ký tài khoản Nhà phát triển Facebook, hệ thống sẽ hiện thông báo xác nhận: bạn chỉ cần bấm **Tiếp tục** -> Đồng ý điều khoản.

### Bước 2: Chọn App và Cấp quyền (Permissions)
Ở bảng điều khiển bên phải màn hình **Graph API Explorer**:
1. **Meta App**: Chọn ứng dụng doanh nghiệp của bạn (nếu chưa có, bấm Tạo App -> Chọn loại Doanh nghiệp/Business).
2. **User or Page**: Chọn **User Token** (Mã truy cập người dùng).
3. Tại ô **Add a permission** (Thêm quyền), lần lượt tìm kiếm và chọn đúng **3 quyền bắt buộc sau**:
   * `ads_read`: Cho phép tool đọc danh sách camp, chi tiêu, số tin nhắn, cpm, ctr.
   * `ads_management`: Cho phép tool gửi lệnh Tắt (PAUSE) khi phát hiện vi phạm.
   * `read_insights`: Cho phép tool trích xuất chỉ số phân tích hiệu suất chuyên sâu.

### Bước 3: Tạo và Sao Chép Mã Token
1. Bấm nút màu xanh **Generate Access Token** (Tạo mã truy cập).
2. Facebook sẽ hiển thị popup cấp quyền ➔ Bấm **Tiếp tục dưới tên bạn**.
3. Tại ô text **Access Token**, bạn sẽ nhận được một chuỗi ký tự rất dài bắt đầu bằng `EAAB...` hoặc `EAA...`.
4. Bấm nút sao chép (Copy) chuỗi ký tự đó để sẵn sàng dán vào Tool.

> [!TIP]
> **Cách kéo dài thời hạn Token (Long-lived Token 60 ngày):**  
> Token lấy nhanh tại Graph API Explorer thường có hạn 1–2 giờ. Để lấy Token chạy ổn định 60 ngày hoặc vĩnh viễn, bạn vào công cụ **Access Token Debugger** của Facebook (`developers.facebook.com/tools/debug/accesstoken`), dán token vào và bấm **Extend Access Token** (Kéo dài mã truy cập).

---

## 4. HƯỚNG DẪN KẾT NỐI TÀI KHOẢN QUẢNG CÁO

1. Mở giao diện Web của Tool tại `http://localhost:3000`.
2. Bấm vào tab **"Tài Khoản Ads"** ở thanh điều hướng bên trái.
3. Bấm nút xanh **"Kết Nối Tài Khoản Thật (Live)"**.
4. Điền các trường thông tin:
   * **Tên gợi nhớ**: Ví dụ: *Tài khoản cá nhân*, *BM Agency ABC*...
   * **Meta User Access Token**: Dán chuỗi `EAA...` vừa copy ở Bước 3.
5. Bấm **"Kiểm Tra & Kết Nối"**:
   * Tool sẽ gửi lệnh lên máy chủ Meta để xác thực quyền hạn.
   * Khi xác thực thành công, hệ thống tự động tải toàn bộ cây tài khoản quảng cáo, chiến dịch và nhóm quảng cáo về giao diện.
6. *(Tùy chọn)* Nếu bạn chỉ muốn chạy thử nghiệm không cần tài khoản thật, bấm nút **"Tạo Dữ Liệu Demo Mock"** để trải nghiệm trước với dữ liệu giả lập thực tế.

---

## 5. GIẢI THÍCH TOÀN BỘ THÔNG SỐ CẦN NHẬP (RULE INPUTS)

Khi bạn vào tab **"Rule Builder"** và bấm **"Tạo Quy Tắc Tự Động Mới"**, dưới đây là giải nghĩa từng ô thông số:

### A. Nhóm Nhận Diện & Phạm Vi Áp Dụng
| Tên Thông Số | Giá Trị Lựa Chọn | Ý Nghĩa Thực Tế Cho Người Chạy Ads |
| :--- | :--- | :--- |
| **Tên Quy Tắc** | Nhập chữ tự do | Đặt tên để dễ quản lý. *VD: "Cắt lỗ adset 100k 0 tin nhắn", "Tắt adset giá mét > 80k".* |
| **Phạm Vi Áp Dụng** | • `Chiến Dịch (CAMPAIGN)`<br>• `Nhóm Quảng Cáo (ADSET)`<br>• `Quảng Cáo (AD)` | Tầng mà tool sẽ can thiệp.<br>👉 **Khuyên dùng:** Chọn **`Nhóm Quảng Cáo (ADSET)`** vì tối ưu tắt/bật ở tầng nhóm là chuẩn nhất đối với camp Tin nhắn. |
| **Đối Tượng Áp Dụng** | • `Tất cả đối tượng đang chạy (ALL_ACTIVE)`<br>• `Chỉ định cụ thể (SELECTED)` | Chọn `Tất cả đối tượng đang chạy` để tool tự động canh mọi nhóm đang active, không cần vào chỉnh lại khi lên camp mới. |

### B. Nhóm Chỉ Số Giám Sát & Ngưỡng
| Tên Thông Số | Giá Trị Lựa Chọn | Ý Nghĩa Thực Tế Cho Người Chạy Ads |
| :--- | :--- | :--- |
| **Chỉ Số Giám Sát** | • `COST_PER_MESSAGING`<br>• `SPEND_WITHOUT_MESSAGES`<br>• `CPM`, `CPC`, `CTR` | **1. `SPEND_WITHOUT_MESSAGES`**: Canh số tiền đã cắn mà **chưa có tin nhắn nào**.<br>**2. `COST_PER_MESSAGING` (CPA)**: Giá trung bình cho mỗi tin nhắn.<br>**3. `CPM` / `CPC` / `CTR`**: Đánh giá độ đắt rẻ của tệp và mức độ hấp dẫn của bài viết. |
| **Toán Tử** | `>`, `>=`, `<`, `<=` | So sánh thực tế với ngưỡng. Thường dùng: **Lớn hơn (`>`)** hoặc **Lớn hơn hoặc bằng (`>=`)**. |
| **Ngưỡng (VNĐ)** | Nhập số tiền | Mức trần bạn chấp nhận. *VD: Nhập `80000` (80.000đ) hoặc `100000` (100.000đ).* |

### C. Nhóm Bộ Lọc An Toàn (Chống Tắt Oan Camp Mới)
> [!IMPORTANT]
> Đây là các thông số cốt lõi giúp bạn không bị tắt nhầm những nhóm quảng cáo mới chạy đang trong giai đoạn máy học hoặc bị delay số liệu.

* **Số Tin Nhắn Tối Thiểu Trước Khi Đánh Giá (`minResults`)**:
  * *Vì sao cần?* Nếu nhóm mới tiêu 30.000đ và ra 1 tin nhắn, sau đó cắn thêm click vọt lên 90.000đ. Nếu tính trung bình ngay lúc này là 90k/tin và tắt ngay thì rất oan.
  * *Lời khuyên:* Đặt từ **`2` đến `3` tin nhắn**. Nhóm quảng cáo phải có đủ 2-3 tin nhắn thì tool mới bắt đầu tính trung bình giá CPA để xét duyệt.
* **Ngưỡng Chi Tiêu Tối Thiểu Cho 0 Tin Nhắn (`minSpend`)**:
  * Dành cho quy tắc 0 tin nhắn. Camp mới cắn 20k-30k chưa ra tin là bình thường. Cần đặt ngưỡng (VD: `100.000đ`), khi nào tiêu chạm 100k mà vẫn 0 tin thì mới kích hoạt điều kiện vi phạm.
* **Số Lần Vi Phạm Liên Tiếp (`consecutiveViolationsRequired`)**:
  * Meta thỉnh thoảng bị trễ cập nhật số liệu (tin nhắn về rồi nhưng 10-15 phút sau Facebook mới đồng bộ lên hệ thống).
  * Đặt là **`2` lần**: Tool quét lần 1 thấy vi phạm -> chỉ ghi nhận nghi vấn; đợi đến chu kỳ quét lần 2 (sau 5-10 phút) nếu vẫn vi phạm thì mới chính thức gửi lệnh tắt.
* **Khoảng Thời Gian Báo Cáo (`reportingWindow`)**:
  * Mặc định chọn **`Hôm nay (TODAY)`** để bám sát ngân sách trong ngày.
* **Chu Kỳ Kiểm Tra (`checkIntervalMinutes`)**:
  * Khoảng cách giữa các lần tool tự động kiểm tra: **2 phút, 3 phút, 5 phút, 10 phút, 15 phút, 30 phút, 1 giờ, 6 giờ**.
  * *(Khuyến nghị: Đặt từ **5 phút đến 15 phút** để vừa bám sát thời gian thực, vừa tránh bị Facebook giới hạn lượt gọi API).*

### D. Hành Động & Cơ Chế Chạy Thử
* **Hành Động Khi Vi Phạm**:
  * **`Tạm Dừng Đối Tượng (PAUSE)`**: Tự động tắt trên Facebook Ads.
  * **`Chỉ Gửi Cảnh Báo (NOTIFY_ONLY)`**: Không tắt, chỉ bắn chuông thông báo trên web.
* **Chế Độ Hoạt Động (Dry Run vs Live Mode)**:
  * **`Dry Run (Mặc định)`**: Chế độ **chạy thử / mô phỏng**. Tool chạy ngầm và ghi log *"Nếu chạy thật thì đối tượng này đã bị tắt"*, nhưng **tuyệt đối không can thiệp thật vào Facebook**.
  * **`Live Mode`**: Khi bạn bấm nút chuyển sang Live Mode, tool sẽ gửi lệnh tắt thật lên Facebook.

---

## 6. 3 KỊCH BẢN THỰC CHIẾN CANH MỐC KHUYÊN DÙNG

### Kịch Bản 1: Cắt lỗ Adset đốt tiền mà KHÔNG có tin nhắn (Chặn đốt tiền vô ích)
* **Tên quy tắc**: `Cắt lỗ: Cắn 100k chưa có tin nhắn`
* **Phạm vi**: `Nhóm Quảng Cáo (ADSET)`
* **Đối tượng**: `Tất cả đối tượng đang chạy (ALL_ACTIVE)`
* **Chỉ số giám sát**: `Chi tiêu khi 0 tin nhắn (SPEND_WITHOUT_MESSAGES)`
* **Toán tử**: `Lớn hơn hoặc bằng (>=)`
* **Ngưỡng**: `100000` VNĐ *(hoặc bằng 1.5 lần giá tin nhắn mục tiêu)*
* **Khoảng thời gian**: `Hôm nay (TODAY)`
* **Chu kỳ kiểm tra**: `Mỗi 5 phút` hoặc `Mỗi 10 phút`
* **Số lần vi phạm liên tiếp**: `1` hoặc `2`
* **Hành động**: `Tạm Dừng Đối Tượng (PAUSE)`

---

### Kịch Bản 2: Tắt Adset có tin nhắn nhưng giá quá đắt (CPA vượt trần)
* **Tên quy tắc**: `Tắt Adset giá tin nhắn > 80k`
* **Phạm vi**: `Nhóm Quảng Cáo (ADSET)`
* **Đối tượng**: `Tất cả đối tượng đang chạy (ALL_ACTIVE)`
* **Chỉ số giám sát**: `Chi phí / Tin Nhắn (COST_PER_MESSAGING)`
* **Toán tử**: `Lớn hơn (>)`
* **Ngưỡng**: `80000` VNĐ
* **Số tin nhắn tối thiểu**: `3` *(Bắt buộc phải có từ 3 tin nhắn trở lên mới tính)*
* **Số lần vi phạm liên tiếp**: `2` *(Phải đắt liên tiếp trong 2 lần quét để tránh Facebook delay)*
* **Chu kỳ kiểm tra**: `Mỗi 10 phút` hoặc `Mỗi 15 phút`
* **Hành động**: `Tạm Dừng Đối Tượng (PAUSE)`

---

### Kịch Bản 3: Cảnh báo CPM đắt / Tệp cạnh tranh cao (Chỉ cảnh báo, không tắt)
* **Tên quy tắc**: `Cảnh báo CPM cao > 150k`
* **Phạm vi**: `Nhóm Quảng Cáo (ADSET)`
* **Chỉ số giám sát**: `CPM (Chi phí 1000 lượt hiển thị)`
* **Toán tử**: `>`
* **Ngưỡng**: `150000` VNĐ
* **Hành động**: `Chỉ Gửi Cảnh Báo (NOTIFY_ONLY)`

---

## 7. CƠ CHẾ TỰ ĐỘNG NGẦM (SCHEDULER) & AN TOÀN

### 🤖 Cơ Chế Tự Động Ngầm (CareScheduler)
* Backend chạy ngầm một tác vụ cron **mỗi 1 phút 1 lần** (`*/1 * * * *`).
* Cron tự động so sánh thời gian từ lần quét cuối cùng với `checkIntervalMinutes` của từng quy tắc.
* Khi đến lượt, hệ thống âm thầm fetch số liệu từ Meta API, đánh giá và thực thi mà bạn không cần phải mở giao diện hay bấm nút gì.

### 🛡️ 7 Tầng Bảo Vệ An Toàn Tuyệt Đối
1. **Mặc định Dry Run**: Mọi quy tắc mới tạo luôn ở trạng thái an toàn, không thể vô tình tắt camp thật khi chưa kiểm thử.
2. **Nút Dừng Khẩn Cấp (Emergency Stop)**: Nút công tắc đỏ ở góc trên bên phải màn hình. Khi bấm, toàn bộ các hành vi can thiệp tắt camp bị đóng băng ngay lập tức.
3. **Chống Gửi Lệnh Trùng Lặp (Idempotency)**: Trước khi gửi lệnh tắt, tool kiểm tra trạng thái trên Meta. Nếu nhóm đã bị tắt từ trước thì bỏ qua để tiết kiệm API.
4. **Xác Thực Sau Khi Tắt (Post-Action Verification)**: Sau khi gửi lệnh tắt, tool truy vấn ngược lại Meta để đảm bảo trạng thái đã chuyển sang `PAUSED`.
5. **Tuyệt Đối Không Tự Bật Lại**: Tool chỉ có tính năng tạm dừng để bảo toàn vốn; không bao giờ tự tiện bật lại các chiến dịch đã tắt.
6. **Đánh Dấu Phân Biệt**: Các nhóm do tool tắt sẽ được gắn cờ `isPausedBySystem: true`, giúp bạn phân biệt rõ ràng giữa nhóm do tool tắt và nhóm do bạn tự tắt tay trên Facebook Ads Manager.
7. **Mã Hóa AES-256**: Token được mã hóa ở tầng database và chỉ giải mã tạm thời trong RAM backend khi thực thi.

---

## 8. XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

### ❓ Lỗi 1: Token không hợp lệ hoặc thiếu quyền
* **Triệu chứng**: Khi bấm kết nối báo *"Token thiếu quyền ads_read"* hoặc *"Invalid token"*.
* **Cách khắc phục**: Quay lại [Graph API Explorer](https://developers.facebook.com/tools/explorer/), kiểm tra xem đã tích đủ 3 quyền (`ads_read`, `ads_management`, `read_insights`) chưa và bấm **Generate Access Token** lại.

### ❓ Lỗi 2: Lỗi chạm giới hạn API (User request limit reached)
* **Triệu chứng**: Thông báo lỗi từ Facebook về Rate Limit.
* **Nguyên nhân**: Bạn đang cài đặt chu kỳ quét quá nhanh (ví dụ 2 phút) cho một tài khoản có hàng trăm nhóm quảng cáo.
* **Cách khắc phục**: Tăng chu kỳ kiểm tra trong Rule Builder lên **10 phút** hoặc **15 phút**.

### ❓ Lỗi 3: Tool đã báo phát hiện vi phạm nhưng trên Facebook Ads camp vẫn chưa tắt
* **Nguyên nhân**: Quy tắc của bạn vẫn đang để cờ **Dry Run**.
* **Cách khắc phục**: Trên danh sách quy tắc trong tab Rule Builder, tìm quy tắc đó và bấm nút **"Bật Live Mode"** (nút sẽ chuyển sang màu đỏ báo hiệu Live Mode).

---

## 9. KIẾN TRÚC KỸ THUẬT & LỆNH DÀNH CHO DEVELOPER

### Cấu Trúc Thư Mục
```
tool_optimize_ads/
├── backend/
│   ├── prisma/             # Schema cơ sở dữ liệu SQLite / PostgreSQL
│   ├── src/
│   │   ├── config/         # Cấu hình biến môi trường
│   │   ├── controllers/    # API Controllers (Account, Campaign, Rule, Audit)
│   │   ├── services/
│   │   │   ├── meta-api/   # Meta Graph API Gateway & Metric Resolver
│   │   │   ├── rule-engine/# Engine so sánh điều kiện & Action Executor
│   │   │   └── scheduler/  # Background Care Scheduler (node-cron)
│   │   └── utils/          # Bộ mã hóa AES-256-GCM
│   └── tests/              # 13 Vitest Unit & Integration Tests
└── frontend/
    └── src/
        ├── components/     # UI Dashboard, Rule Builder, Simulator, Accounts
        └── services/       # Client API Service
```

### Các Lệnh Tiện Ích
```bash
# Kiểm tra bộ test an toàn (13/13 tests pass)
npm run test

# Khởi chạy riêng Backend
npm run dev:backend

# Khởi chạy riêng Frontend
npm run dev:frontend

# Mở Prisma Studio để xem dữ liệu Database trực quan
cd backend && npx prisma studio
```

---

**Chúc bạn vận hành chiến dịch hiệu quả, tối ưu chi phí và bảo toàn ngân sách quảng cáo tối đa!** 🚀
