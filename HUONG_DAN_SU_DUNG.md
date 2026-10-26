# 📘 CẨM NANG HƯỚNG DẪN SỬ DỤNG — AUTO ADS CARE
> **Hệ thống tự động canh camp, tối ưu chi phí & bảo vệ ngân sách quảng cáo Facebook Ads 24/7**  
> *Phiên bản: v2.0 (Hỗ trợ Meta Marketing API v22.0 & POS Pancake)*

---

## 📑 MỤC LỤC NỘI DUNG

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Chi Tiết 8 Tính Năng Cốt Lõi](#2-chi-tiết-8-tính-năng-cốt-lõi)
   - [1. Tổng Quan (Dashboard)](#1-tổng-quan-dashboard)
   - [2. Quản Lý Tài Khoản Ads](#2-quản-lý-tài-khoản-ads)
   - [3. Chiến Dịch & Nhóm Ads (Hierarchy)](#3-chiến-dịch--nhóm-ads-hierarchy)
   - [4. POS Pancake & Đánh Giá Lãi/Lỗ](#4-pos-pancake--đánh-giá-lãilỗ)
   - [5. Trung Tâm Quy Tắc (Rules)](#5-trung-tâm-quy-tắc-rules)
   - [6. Mô Phỏng Quy Tắc (Rule Simulator)](#6-mô-phỏng-quy-tắc-rule-simulator)
   - [7. Nhật Ký Tự Động (Logs / Audit Trail)](#7-nhật-ký-tự-động-logs--audit-trail)
   - [8. Quản Lý Nhân Viên & Phân Quyền (Users)](#8-quản-lý-nhân-viên--phân-quyền-users)
3. [Hướng Dẫn Cài Đặt Rule Theo Giá Tiền Cho TẤT CẢ Ads](#3-hướng-dẫn-cài-đặt-rule-theo-giá-tiền-cho-tất-cả-ads)
   - [Kịch bản 1: Tắt khi giá mỗi tin nhắn (CPA) quá cao](#kịch-bản-1-tắt-khi-giá-mỗi-tin-nhắn-cpa-quá-cao)
   - [Kịch bản 2: Tắt khi cắn tiền mà 0 ra tin nhắn (Chống cháy tiền)](#kịch-bản-2-tắt-khi-cắn-tiền-mà-0-ra-tin-nhắn-chống-cháy-tiền)
   - [Kịch bản 3: Tắt khi tiền Ads chiếm quá nhiều Doanh thu Pancake](#kịch-bản-3-tắt-khi-tiền-ads-chiếm-quá-nhiều-doanh-thu-pancake)
4. [Các Cơ Chế An Toàn Chạy Ngầm](#4-các-cơ-chế-an-toàn-chạy-ngầm)
   - [🚨 Emergency Stop (Nút Dừng Khẩn Cấp)](#-emergency-stop-nút-dừng-khẩn-cấp)
   - [🛡️ Dry Run vs Live Mode](#️-dry-run-vs-live-mode)
   - [⏳ Cơ Chế Đánh Thức Render Free (Cold Start 30-50s)](#-cơ-chế-đánh-thức-render-free-cold-start-30-50s)
   - [🛑 Chống Tắt Nhầm (Consecutive Violations & Min Results)](#-chống-tắt-nhầm-consecutive-violations--min-results)
5. [Khắc Phục Sự Cố Thường Gặp (Troubleshooting)](#5-khắc-phục-sự-cố-thường-gặp-troubleshooting)

---

## 1. TỔNG QUAN HỆ THỐNG

**Auto Ads Care** là công cụ đóng vai trò như một **trợ lý Media Buyer tự động 24/7**. Khi bạn bận việc, đi ra ngoài hoặc đang ngủ, bot sẽ định kỳ quét số liệu từ Facebook Ads và Pancake POS để:

```
┌────────────────────────────────────────┐         ┌────────────────────────────────────────┐
│          SỐ LIỆU TỪ FACEBOOK           │         │         MỐC GIÁ TIỀN BẠN CÀI ĐẶT       │
│  (Cứ mỗi 15 phút bot tự kiểm tra 1 lần)│         │          (Ngưỡng bạn chịu được)        │
│                                        │   VS    │                                        │
│  Ví dụ Nhóm Ads 1:                     │         │  Ví dụ: CPA cho phép tối đa = 70.000đ  │
│  - Tiền tiêu: 240.000 VNĐ              │         │  - Vi phạm: Lớn hơn 70.000đ            │
│  - Tin nhắn ra: 2 tin (CPA = 120.000đ) │         │  - Số lần xác nhận: 2 lần liên tiếp    │
└────────────────────────────────────────┘         └────────────────────────────────────────┘
                                             │
                                             ▼
                          Bot phát hiện: 120.000đ > 70.000đ (2 lần)
                          => Gửi lệnh sang Facebook: TẮT NGAY NHÓM ADS 1!
```

---

## 2. CHI TIẾT 8 TÍNH NĂNG CỐT LÕI

### 1. Tổng Quan (Dashboard)
- **Các thẻ chỉ số KPI**:
  - **Tổng chi tiêu hôm nay**: Số tiền ads đã cắn trong ngày.
  - **Tổng số tin nhắn / kết quả**: Lượng lead/mess thu về.
  - **CPA trung bình**: Chi phí trung bình để có 1 tin nhắn.
  - **Doanh thu đối soát Pancake**: Tiền đơn hàng thực tế do shop chốt được.
  - **Tỷ lệ Ads / Doanh thu**: Đo lường lãi/lỗ thực tế.
- **Biểu đồ động**: Theo dõi biến động chi tiêu và hiệu quả theo các mốc thời gian.
- **Top chiến dịch**: Thống kê chiến dịch đang mang lại tin nhắn rẻ nhất và cảnh báo chiến dịch có nguy cơ bị phạt.

### 2. Quản Lý Tài Khoản Ads
- **Chế độ Mock Demo**: Tạo tài khoản giả lập chiến dịch mẫu để thử nghiệm giao diện, tính năng mà không cần tài khoản Facebook thật.
- **Kết nối Tài khoản thật (Live Mode)**:
  - Nhập **Access Token** lấy từ *Meta for Developers*.
  - Token được mã hóa an toàn 2 lớp bằng thuật toán AES-256 trước khi lưu trữ vào cơ sở dữ liệu.
- **Nút "Đồng bộ ngay" (Sync Account)**: Gọi trực tiếp API Meta để cập nhật các chiến dịch mới nhất về hệ thống.

### 3. Chiến Dịch & Nhóm Ads (Hierarchy)
- Quản lý theo cấu trúc cây 3 tầng chuẩn mực: **Campaign (Chiến Dịch) ➔ Ad Set (Nhóm Ads) ➔ Ad (Quảng Cáo)**.
- Xem chi tiết: Tên, ID, Trạng thái (Đang chạy / Tạm dừng), Ngân sách hàng ngày, Số tiền đã tiêu, Số tin nhắn, Giá mỗi tin nhắn.
- Nút bật/tắt thủ công nhanh bằng tay cho từng đối tượng.

### 4. POS Pancake & Đánh Giá Lãi/Lỗ
- Kết nối thông qua API Token của Pancake.vn.
- Phân loại màu sắc trực quan:
  - 🟢 **Xanh lá (Hiệu quả)**: Chi phí Ads < 25% doanh thu -> Doanh nghiệp đang có lãi tốt.
  - 🟡 **Vàng (Cảnh báo)**: Chi phí Ads từ 25% đến 35% doanh thu -> Cần theo dõi thêm.
  - 🔴 **Đỏ (Lỗ / Nguy hiểm)**: Chi phí Ads > 35% doanh thu -> Cần cắt giảm hoặc tắt ngay.

### 5. Trung Tâm Quy Tắc (Rules)
- Nơi thiết lập các "luật" tự động tắt/bật quảng cáo.
- Cho phép áp dụng cho **TẤT CẢ** các chiến dịch hoặc **CHỈ ĐỊNH** từng chiến dịch cụ thể.
- Có công tắc chuyển đổi giữa **DRY RUN** (chạy thử) và **LIVE MODE** (chạy thật).

### 6. Mô Phỏng Quy Tắc (Rule Simulator)
- Trước khi kích hoạt bất kỳ quy tắc nào, bạn có thể đưa quy tắc đó vào tab **Mô Phỏng**.
- Bot sẽ tính toán trên dữ liệu hiện tại và trả lời: *"Nếu bật quy tắc này thì nhóm ads nào sẽ bị tắt? Có nguy cơ tắt nhầm ads tốt không?"*.
- Giúp bạn yên tâm 100% trước khi cho bot chạy thật trên tài khoản tiền thật.

### 7. Nhật Ký Tự Động (Logs / Audit Trail)
- Lưu trữ mọi hành động quét của bot theo từng giây:
  - Thời gian quét (ví dụ: `14:30:15`).
  - Đối tượng: `[AdSet] Váy Trễ Vai Đen - Nhóm 2`.
  - Chỉ số: `CPA đo được = 95.000đ / Ngưỡng = 70.000đ`.
  - Kết quả: `Vi phạm lần 2/2 -> ĐÃ TẠM DỪNG (PAUSED)`.
- Minh bạch 100%, có thể tra cứu và đối soát bất cứ lúc nào.

### 8. Quản Lý Nhân Viên & Phân Quyền (Users)
- Quản trị viên (Admin) tạo tài khoản nhân viên (Staff).
- Mỗi nhân viên chỉ được xem và tối ưu **đúng các tài khoản quảng cáo được Admin phân công**, tránh lộ dữ liệu kinh doanh giữa các team.

---

## 3. HƯỚNG DẪN CÀI ĐẶT RULE THEO GIÁ TIỀN CHO TẤT CẢ ADS

Dưới đây là 3 kịch bản phổ biến nhất giúp bạn tối ưu chi phí:

### Kịch bản 1: Tắt khi giá mỗi tin nhắn (CPA) quá cao

> **Mục tiêu**: Bất kỳ nhóm quảng cáo nào có giá mỗi tin nhắn vượt quá **80.000đ** thì tự động dừng.

1. Vào menu **Trung Tâm Quy Tắc (Rules)** ➔ Bấm **"+ Tạo Quy Tắc Mới"** (hoặc Sửa quy tắc có sẵn).
2. Điền các trường như sau:
   - **Tên quy tắc**: `Tự động tắt nhóm tin nhắn đắt (> 80k)`
   - **Phạm vi áp dụng (Scope)**: Chọn `Nhóm Quảng Cáo (ADSET)`
   - **Mục tiêu áp dụng**: Chọn **"Tất cả đối tượng đang chạy (Active)"** (`ALL_ACTIVE`)
   - **Chỉ số giám sát**: Chọn **`Chi phí / Tin Nhắn (CPA)`**
   - **Toán tử**: Chọn **`Lớn hơn (>)`**
   - **Ngưỡng**: Nhập `80000` (VNĐ)
   - **Số tin nhắn tối thiểu trước khi đánh giá**: Nhập `3` *(Tránh vừa cắn 1 tin đầu tiên đắt đã bị tắt oan)*
   - **Số lần vi phạm liên tiếp**: Nhập `2` lần *(Phải vi phạm 2 chu kỳ quét liên tiếp mới tắt)*
   - **Khoảng thời gian báo cáo**: Chọn `Hôm nay (Today)`
   - **Chu kỳ kiểm tra**: Chọn `Mỗi 15 phút`
   - **Hành động khi vi phạm**: Chọn `Tạm Dừng Đối Tượng (PAUSE)`
3. Bấm **"Lưu Quy Tắc"**.

---

### Kịch bản 2: Tắt khi cắn tiền mà 0 ra tin nhắn (Chống cháy tiền)

> **Mục tiêu**: Nhóm ads cắn tới **150.000đ** mà không ra nổi 1 tin nhắn nào thì lập tức dừng ngay để bảo toàn ngân sách.

1. Bấm **"+ Tạo Quy Tắc Mới"**:
   - **Tên quy tắc**: `Chống cháy tiền - Cắn > 150k không có tin nhắn`
   - **Phạm vi áp dụng (Scope)**: Chọn `Nhóm Quảng Cáo (ADSET)`
   - **Mục tiêu áp dụng**: Chọn **"Tất cả đối tượng đang chạy (Active)"**
   - **Chỉ số giám sát**: Chọn **`Chi tiêu khi 0 tin nhắn`**
   - **Toán tử**: Chọn **`Lớn hơn hoặc bằng (>=)`**
   - **Ngưỡng**: Nhập `150000` (VNĐ)
   - **Ngưỡng chi tiêu tối thiểu**: Nhập `150000` (VNĐ)
   - **Số lần vi phạm liên tiếp**: Nhập `2` lần
   - **Khoảng thời gian báo cáo**: Chọn `Hôm nay (Today)`
   - **Chu kỳ kiểm tra**: Chọn `Mỗi 15 phút`
   - **Hành động khi vi phạm**: Chọn `Tạm Dừng Đối Tượng (PAUSE)`
2. Bấm **"Lưu Quy Tắc"**.

---

### Kịch bản 3: Tắt khi tiền Ads chiếm quá nhiều Doanh thu Pancake

> **Mục tiêu**: Nhóm quảng cáo có tỷ lệ tiền ads vượt quá **40% doanh thu thực tế** (bị lỗ) thì tự động tắt.

1. Bấm **"+ Tạo Quy Tắc Mới"**:
   - **Tên quy tắc**: `Cắt lỗ - Tiền Ads > 40% Doanh thu Pancake`
   - **Phạm vi áp dụng**: `Chiến Dịch (CAMPAIGN)` hoặc `Nhóm Quảng Cáo (ADSET)`
   - **Mục tiêu áp dụng**: `Tất cả đối tượng đang chạy (Active)`
   - **Chỉ số giám sát**: Chọn **`Chi phí Ads / Doanh thu Pancake (%)`**
   - **Toán tử**: Chọn **`Lớn hơn (>)`**
   - **Ngưỡng**: Nhập `40` (%)
   - **Hành động khi vi phạm**: `Tạm Dừng Đối Tượng (PAUSE)`
2. Bấm **"Lưu Quy Tắc"**.

---

## 4. CÁC CƠ CHẾ AN TOÀN CHẠY NGẦM

### 🚨 Emergency Stop (Nút Dừng Khẩn Cấp)
- Nằm ở góc trên bên phải thanh Header (Nút màu đỏ).
- **Khi được kích hoạt**: Mọi hành động can thiệp ghi (Pause/Update) vào Facebook Ads đều bị **đóng băng 100% ngay lập tức**.
- Thích hợp khi bạn muốn tắt bot tạm thời để điều chỉnh chiến dịch bằng tay hoặc khi gặp bão Facebook.

### 🛡️ Dry Run vs Live Mode
- **DRY RUN (Mô phỏng an toàn)**: Bot vẫn kiểm tra và ghi lại vào Nhật ký vi phạm, nhưng **KHÔNG** gọi API Facebook để tắt thật. Dùng để test độ chính xác của quy tắc.
- **LIVE MODE (Thực thi thật)**: Bot sẽ chính thức gửi lệnh sang Facebook Ads Manager để tắt các nhóm ads vi phạm.

### ⏳ Cơ Chế Đánh Thức Render Free (Cold Start 30-50s)
- Máy chủ Backend trên **Render (gói Free)** có cơ chế tự động chuyển sang trạng thái ngủ (Spin down) khi không có request trong 15 phút.
- **Hệ thống xử lý thông minh**:
  - Giao diện sẽ hiển thị thanh trạng thái: `⏱️ Đang chờ: 15s (dự kiến 30-50s)` kèm thanh tiến trình.
  - Tự động ping lặp lại mỗi 3.5 giây để đánh thức Render.
  - Khi Render thức dậy và trả về `200 OK`, hệ thống sẽ tự nạp dữ liệu và chuyển sang trạng thái xanh mà bạn không cần phải F5 tải lại trang.

### 🛑 Chống Tắt Nhầm (Consecutive Violations & Min Results)
- **Min Results (Kết quả tối thiểu)**: Ngăn chặn việc vừa ra 1 tin nhắn đầu tiên đắt đã bị tắt nhóm ads tiềm năng.
- **Consecutive Violations (Vi phạm liên tiếp)**: Bắt buộc đối tượng phải vi phạm 2 chu kỳ quét liên tiếp mới tắt, tránh bị ảnh hưởng bởi việc Facebook chậm cập nhật số liệu.

---

## 5. KHẮC PHỤC SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

| Hiện Tượng | Nguyên Nhân | Cách Xử Lý |
| :--- | :--- | :--- |
| **Giao diện báo "Đang kết nối & đánh thức máy chủ Backend..."** | Backend trên Render đang ở trạng thái ngủ (Spin Down). | Vui lòng chờ từ **30 đến 50 giây**, hệ thống đang tự động đánh thức máy chủ và sẽ nạp dữ liệu ngay khi sẵn sàng. |
| **Không tải được dữ liệu tài khoản thật** | Token Meta hết hạn hoặc thiếu quyền truy cập. | Vào Meta for Developers lấy Token mới với đủ 3 quyền: `ads_read`, `ads_management`, `read_insights`, sau đó vào tab "Tài Khoản Ads" để kết nối lại. |
| **Quy tắc vi phạm nhưng chiến dịch không bị tắt trên Facebook** | Quy tắc đang ở chế độ `Dry Run`. | Vào tab **Trung Tâm Quy Tắc (Rules)** ➔ Bấm nút **"Bật Live Mode"** tại quy tắc đó và xác nhận. |
| **Muốn đổi sang máy chủ Backend khác** | Bạn deploy backend sang VPS riêng hoặc localhost. | Bấm nút **"Cấu hình URL"** trên thanh banner ➔ Nhập URL mới ➔ Bấm **"Kiểm tra Ping"** ➔ Bấm **"Lưu & Áp Dụng"**. |

---

*Tài liệu được biên soạn tự động cho dự án **Auto Ads Care**.*
