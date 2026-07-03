# Hướng dẫn Sử dụng — ENSHIDO Jewelry

Hệ thống quản lý đơn hàng sản xuất xưởng kim hoàn. Tài liệu này hướng dẫn thao tác theo từng tính năng và **vai trò** sử dụng.

- Web: **http://localhost:3000** (hoặc domain nội bộ). API/Swagger: `/api/docs`.
- Tài khoản demo (mật khẩu `123456`): `admin@enshido.vn`, `quanly@enshido.vn`, `tho1@enshido.vn`, `qc@enshido.vn`, `kho@enshido.vn`, `ketoan@enshido.vn`.

## Mục lục
1. [Vai trò & phân quyền](#1-vai-trò--phân-quyền)
2. [Tài khoản: đăng ký (cấp tài khoản), đăng nhập, đổi/khôi phục mật khẩu](#2-tài-khoản)
3. [Khách hàng](#3-khách-hàng)
4. [Đơn hàng](#4-đơn-hàng)
5. [Quét QR (Thợ): cập nhật công đoạn · KL tiếp nhận · gom lô](#5-quét-qr-thợ)
6. [Trọng lượng & hao hụt](#6-trọng-lượng--hao-hụt)
7. [Lô sản xuất (Đúc / Xi mạ theo mẻ)](#7-lô-sản-xuất)
8. [Bảng Kanban](#8-bảng-kanban)
9. [QC kiểm tra](#9-qc-kiểm-tra)
10. [Tồn kho & Nhập kho thành phẩm](#10-tồn-kho)
11. [Nhân sự & công việc theo tháng](#11-nhân-sự)
12. [Báo cáo & Dashboard](#12-báo-cáo--dashboard)
13. [Tự động hóa](#13-tự-động-hóa)
14. [Câu hỏi thường gặp](#14-câu-hỏi-thường-gặp)

---

## 1. Vai trò & phân quyền

Có **6 vai trò**; menu và quyền thao tác lọc theo vai trò (kiểm soát ở cả server).

| Vai trò | Dùng để | Thấy các mục chính |
|---|---|---|
| **Admin / Chủ xưởng** | Toàn quyền | Tất cả |
| **Quản lý sản xuất** | Điều hành đơn/sản xuất | Đơn, Kanban, Lô, QC, Tồn kho, Nhân sự, Báo cáo, Tự động hóa |
| **Thợ** | Sản xuất | Việc của tôi, Quét QR, Lô sản xuất |
| **QC** | Kiểm định | QC kiểm tra, Đơn hàng (xem) |
| **Kho** | Nhập/xuất kho | Tồn kho, Nhập kho TP, Nhà cung cấp |
| **Kế toán / Hành chính** | Hồ sơ, chi phí | Nhân sự, Khách hàng, Báo cáo, Tồn kho |

> **Thợ** sau khi đăng nhập được đưa thẳng tới **"Việc của tôi"**.

---

## 2. Tài khoản

### 2.1 "Đăng ký" = Cấp tài khoản (không tự đăng ký công khai)
Vì lý do bảo mật, hệ thống **không có màn đăng ký tự do**. Tài khoản do **Admin / Kế toán** tạo:

1. Vào **Nhân sự → "+ Thêm nhân viên"**.
2. Nhập họ tên, **email (bắt buộc — dùng để đăng nhập)**, vai trò tài khoản, phòng ban…
3. Bấm **"Lưu & cấp tài khoản"** → hệ thống sinh **mật khẩu ngẫu nhiên**, hiển thị **một lần** → sao chép đưa cho nhân viên.

### 2.2 Đăng nhập
- Vào trang **/login**, nhập **email + mật khẩu** → Đăng nhập.
- (Bản demo) có nút đăng nhập nhanh cho 6 vai trò.

### 2.3 Đổi mật khẩu / Khôi phục
- **Tự đổi mật khẩu**: menu trái dưới → **"🔑 Đổi mật khẩu"** (nhập mật khẩu cũ + mới).
- **Admin reset**: Nhân sự → mở nhân viên → **"🔑 Reset mật khẩu"** → mật khẩu mới hiện một lần.
- Nhân viên **nghỉ việc** → tài khoản bị **khóa** (không xóa, giữ lịch sử).

---

## 3. Khách hàng
*(Admin / Quản lý / Kế toán)*

- **Khách hàng → "+ Thêm khách"**: tên, SĐT, kênh bán, nhóm khách… → sinh mã `KH-######`.
- Bấm vào khách để xem **chi tiết + lịch sử đơn**.
- Tìm kiếm theo tên; đếm số đơn theo khách.

---

## 4. Đơn hàng
*(Tạo/sửa: Admin / Quản lý — Xem: thêm QC, Kho, Kế toán)*

### 4.1 Tạo đơn
**Đơn hàng → "+ Tạo đơn hàng"**:
- **Tên đơn** (tùy chọn) — để dễ nhận diện; **bỏ trống sẽ hiển thị theo mã đơn** `SX-YYYYMMDD-####`.
- Chọn **khách hàng**, kênh bán, loại đơn, mức ưu tiên, **deadline**.
- **Ghi chú**: trình soạn **rich text** (in đậm, danh sách, liên kết…).
- Thêm **nhiều sản phẩm** (tên, chất liệu, đá, size, **TL ban đầu**, yêu cầu kỹ thuật).
- Lưu → mã đơn tự sinh.

### 4.2 Chi tiết đơn
Tiêu đề là **tên đơn** (kèm mã đơn). Trên trang chi tiết:
- **Chuyển trạng thái** (chỉ cho phép bước hợp lệ theo vòng đời): Chờ SX → Đang SX → Chờ QC → (Đạt) Hoàn thành SX → Nhập kho → Bàn giao → Hoàn tất. (Rẽ nhánh: Cần sửa / QC không đạt / Hủy.)
- **🖨️ In phiếu sản xuất**: hiện phiếu + **mã QR**; dưới QR là **URL đích** (dùng IP LAN/domain) để **quét từ điện thoại/app ngoài**.
- **✏️ Sửa đơn** (chỉ khi đơn **chưa vào sản xuất**): sửa thông tin + thêm/bớt sản phẩm.
- **Hủy đơn**: chuyển "Đã hủy" và **vô hiệu hóa QR**.
- Các khối: **Ghi chú đơn** (hiển thị định dạng), **Sản phẩm**, **Quy trình sản xuất** (gán thợ từng công đoạn), **Theo dõi trọng lượng & hao hụt** (§6), **Ảnh đính kèm**, **Lịch sử QC**, **Nhật ký thao tác**.

### 4.3 Cấu hình công đoạn
Nếu đơn chưa có công đoạn: bấm **"Cấu hình công đoạn mặc định"** để nạp quy trình 9 bước (Thiết kế 3D → In sáp → Đúc → Làm nguội → Gắn đá → Xi mạ → Đánh bóng → QC → Nhập kho TP). Gán thợ cho từng công đoạn qua dropdown.

### 4.4 Lọc & xuất
Danh sách đơn: tìm theo **tên/mã/khách/sản phẩm**, lọc trạng thái/ưu tiên/đơn trễ, **⬇ Xuất CSV**.

---

## 5. Quét QR (Thợ)

Vào **"Quét QR (Thợ)"**. Có **2 chế độ** (nút chuyển ở đầu trang):

### 5.1 Mở đơn (cập nhật 1 đơn)
1. Bấm **"📷 Mở camera quét QR"** rồi quét phiếu (hoặc nhập mã thủ công).
2. Màn công đoạn hiện tại của đơn với các nút lớn:
   - **✋ Tiếp nhận** — có ô **"KL tiếp nhận (g) — tùy chọn"**: cân khi nhận hàng để ghi mốc (tạo bản cân "Tiếp nhận").
   - **▶️ Bắt đầu** — đơn vào "Đang sản xuất".
   - **✓ Hoàn thành công đoạn** — nhập **số lượng** + **TL trước/sau**, xem **hao hụt realtime**, rồi lưu.
   - **⚠️ Báo lỗi** — ghi chú + đính kèm ảnh; quản lý nhận cảnh báo realtime.
- Công việc được **tín cho người quét QR thực tế** (không phải người được gán kế hoạch).

### 5.2 Gom lô (Đúc / Xi mạ)
Dùng khi làm **theo mẻ nhiều đơn** (xem §7):
1. Chuyển chế độ **"🔥 Gom lô"** → **"Bắt đầu quét gom"**.
2. **Quét lần lượt nhiều QR**: đơn đầu tiên xác định công đoạn (Đúc/Xi mạ) và **tự tạo lô**; các đơn sau gom tiếp.
3. Bấm **"Mở lô để chốt →"** để sang trang **Lô sản xuất** cân & chốt.

---

## 6. Trọng lượng & hao hụt
*(Trong chi tiết đơn — Admin / Quản lý / QC)*

- Bấm **"+ Nhập cân"**:
  - **Chọn công đoạn** (danh sách công đoạn của đơn, hiển thị tiếng Việt).
  - **Chọn người cân** (mặc định "Tôi").
  - Nhập **TL trước / TL sau** → **Lưu cân**.
- **Trùng công đoạn = chỉnh sửa**: nhập lại cùng công đoạn thì bảng hiển thị **1 dòng/công đoạn** (số mới nhất); các lần cân cũ vẫn lưu — bấm **"đã cân N×"** để xem lịch sử.
- Bảng hiển thị hao hụt g/%, **lũy kế %** (tô đỏ + ⚠️ khi **vượt định mức**), người cân, thời điểm.

---

## 7. Lô sản xuất
*(Thợ / Quản lý / Admin — mục "🔥 Lô sản xuất")*

Dành cho công đoạn làm **theo mẻ** (mặc định **Đúc, Xi mạ**): gom nhiều đơn, cân tổng cả lô rồi **tự phân bổ hao hụt về từng đơn** (giữ đúng số liệu per-đơn).

1. **Tạo lô**: chọn công đoạn (Đúc/Xi mạ).
2. **Gom đơn**: **"+ Thêm đơn"** (chọn từ danh sách đơn đang chờ công đoạn đó) hoặc **"📷 Quét QR"** — hoặc gom sẵn từ màn Quét QR (§5.2).
3. **Chốt lô**: nhập **Tổng KL ra** (cân cả mẻ) → hệ thống **xem trước phân bổ** hao hụt theo tỉ lệ khối lượng (có thể **sửa tay** từng đơn ở cột "hao hụt") → **"Chốt lô & phân bổ"**.
   - Mỗi đơn được ghi **một bản cân** riêng; công đoạn của tất cả đơn chuyển **Hoàn thành**; hỗ trợ **tăng cân** (xi mạ).

---

## 8. Bảng Kanban
*(Admin / Quản lý — mục "Kanban sản xuất")*

Có **2 chế độ** (nút chuyển ở góc phải):

- **Theo trạng thái đơn** *(mặc định)*: cột = trạng thái đơn (Chờ SX · Đang SX · Chờ QC · Cần sửa · …). **Kéo–thả** thẻ đơn giữa cột để **đổi trạng thái** (chỉ cho bước hợp lệ). Bấm **"⚙️ Cấu hình cột"** để thêm/ẩn/đổi tên/sắp xếp cột.
- **Theo công đoạn**: cột = 9 công đoạn; mỗi đơn nằm ở **công đoạn hiện tại** (kèm tiến độ X/9, cờ "🔥 trong lô"). **Kéo thẻ sang cột kế tiếp = đánh dấu công đoạn hoàn thành** (thao tác nhanh của quản lý).

Thẻ hiển thị tên/mã đơn, ưu tiên, cảnh báo **trễ hạn** / **hao hụt**; cập nhật **realtime**.

---

## 9. QC kiểm tra
*(QC / Quản lý / Admin — mục "QC kiểm tra")*

1. **Thanh thống kê**: đơn chờ QC · đã kiểm hôm nay · đạt hôm nay · tỷ lệ đạt.
2. Chọn một đơn ở danh sách để mở **phiếu kiểm**: thông tin sản phẩm (ảnh, chất liệu, đá, size, **trọng lượng + % hao hụt có cảnh báo**). Đơn nhiều SP → chọn từng SP để kiểm.
3. Chấm **bộ 8 tiêu chí** (Đạt / Lỗi / Bỏ qua) — tiêu chí nghiêm trọng đánh dấu ●.
4. Chọn kết quả:
   - **✓ Đạt** → đơn "Hoàn thành sản xuất".
   - **✎ Cần sửa** / **✗ Không đạt** → mở form gọn: **Tên lỗi** + **Mô tả (rich text)** + **Ảnh (tùy chọn)** → đơn về **"Cần sửa"**; hệ thống **tự chọn công đoạn trả về** (công đoạn vừa xong gần nhất) và đếm số lần làm lại.
5. **Lịch sử kiểm** hiển thị ngay dưới phiếu (kết quả, lỗi, mô tả, ảnh, người kiểm).

---

## 10. Tồn kho
*(Kho / Quản lý / Admin; Kế toán xem)*

- **Tồn kho**: danh mục vật tư theo **7 nhóm** (nguyên liệu, đá, phụ kiện, hóa chất, bao bì, bán thành phẩm, thành phẩm) + badge trạng thái (đủ / sắp hết / hết) + tổng giá trị tồn.
- Thao tác **Nhập / Xuất (gắn đơn) / Chuyển kho** — xuất vượt tồn bị chặn; lịch sử giao dịch bất biến.
- **Nhà cung cấp**: CRUD, mã `NCC-######`.
- **Nhập kho TP**: danh sách đơn đã **QC PASS** → nhập kho thành phẩm → đơn chuyển **"Đã nhập kho TP" (STOCKED)** (khép kín luồng).

---

## 11. Nhân sự
*(Admin / Kế toán ghi — Quản lý xem)*

- **Thêm / sửa hồ sơ**: họ tên, SĐT, email, phòng ban, chức vụ, ngày vào làm, trạng thái, kỹ năng. Tạo nhân viên = **cấp luôn tài khoản** (§2.1). Nút **"✏️ Sửa thông tin"** để cập nhật (đổi tên đồng bộ tên tài khoản).
- **Công việc trong tháng**: mở nhân viên → chọn tháng → xem **công đoạn hoàn thành, sản lượng, đúng hạn, tỷ lệ lỗi, lượt QC, hao hụt gây ra** (tính theo người **thực hiện thực tế**).
- **Reset mật khẩu** (Admin).

---

## 12. Báo cáo & Dashboard
*(Admin / Quản lý / Kế toán)*

- **Dashboard**: thẻ chỉ số (tổng đơn, đang SX, trễ hạn, chờ QC, hoàn thành hôm nay, tỷ lệ QC đạt) + biểu đồ trạng thái/công đoạn tắc, realtime.
- **Báo cáo** (chọn khoảng ngày) — 6 tab: Đơn hàng · Sản xuất · QC · **Hao hụt** · Năng suất thợ · Tồn kho. Mỗi tab có biểu đồ + bảng + **Xuất CSV**.

---

## 13. Tự động hóa
*(Admin / Quản lý / Kế toán — mục "Tự động hóa")*

- **Cảnh báo trễ đơn** & **gợi ý phân công** (theo tải/kỹ năng).
- **KPI & lương theo sản lượng**; **giá vốn** đơn (vật tư + công + quy đổi hao hụt).
- **Cấu hình luật** (đơn giá công, đơn giá kim loại, thưởng đúng hạn, phạt lỗi…).
- **Tích hợp** (Shopee/Lazada/TikTok/Kế toán) — hiện ở dạng stub idempotent.

---

## 14. Câu hỏi thường gặp

**Không đăng ký được?** — Đúng thiết kế: tài khoản do Admin/Kế toán cấp qua **Nhân sự** (§2.1).

**Quét QR bằng điện thoại không mở trang?** — Điện thoại phải cùng mạng LAN với máy chủ (dev), hoặc hệ thống đã đặt domain. QR đã nhúng **URL đích** (hiện dưới mã QR trên phiếu). Quản trị có thể đặt `PUBLIC_WEB_ORIGIN` (xem [DEPLOYMENT.md](./DEPLOYMENT.md)).

**Sửa đơn không được?** — Đơn đã **vào sản xuất** thì không sửa thông tin chính (chỉ cập nhật qua công đoạn/QC). Chỉ sửa khi đơn còn ở Chờ SX.

**Nhập cân sai, sửa thế nào?** — Nhập lại **cùng công đoạn** (số mới sẽ thay dòng cũ; lịch sử vẫn lưu — §6).

**Thợ không thấy menu Đơn hàng?** — Đúng phân quyền: thợ dùng **"Việc của tôi"** + **Quét QR**.

**Quên/đổi mật khẩu?** — Tự đổi ở "🔑 Đổi mật khẩu"; hoặc nhờ Admin **Reset** (§2.3).

---

Xem thêm: [`README.md`](../README.md) · [`docs/REPORT.html`](./REPORT.html) (báo cáo tính năng kèm ảnh) · [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md).
