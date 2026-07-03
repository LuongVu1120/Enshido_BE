# Feature Specification: Tên đơn · Ghi chú rich content · Sửa hồ sơ nhân viên

**Feature Branch**: `010-order-naming-notes-employee-edit`
**Created**: 2026-06-19
**Status**: Draft (chờ duyệt)
**Depends on**: `001-mvp-core` (đơn hàng), `004-hr-workforce` (nhân sự), `006-order-board-refinements` (sửa đơn + Kanban).

## Bối cảnh & phát hiện

Rà soát theo 3 yêu cầu của người dùng:

1. **Tên đơn**: hiện đơn chỉ hiển thị theo **mã đơn** (`SX-YYYYMMDD-####`) ở mọi nơi (danh sách, chi tiết, Kanban, phiếu in). Khó nhận diện đơn. `Order` **chưa có** trường `name`.
2. **Ghi chú đơn**: `Order.note` là chuỗi 1 dòng (`<Input>`), **không định dạng**, **không được sanitize**, và **không hề được hiển thị** ở trang chi tiết đơn (chỉ nhập lúc tạo/sửa rồi "biến mất").
3. **Hồ sơ nhân viên không sửa được**: API đã có `PUT /employees/:id` + `EmployeesService.update()`, nhưng **giao diện thiếu nút/sửa** — trang chi tiết NV chỉ xem hồ sơ + "Reset mật khẩu". Đây là khoảng trống ở frontend.

## User Stories *(mandatory)*

### US1 — Đặt tên đơn dễ đọc (P1)
Là **quản lý**, tôi muốn đặt một **tên đơn** dễ hiểu (vd "Nhẫn cưới chị Lan — bộ 2 cái") để nhận diện nhanh thay vì đọc mã.
- Nhập tên khi **tạo đơn** và sửa được khi **sửa đơn**.
- **Mặc định**: nếu để trống tên → hệ thống hiển thị **mã đơn**.
- Tên hiển thị ở: **danh sách đơn, chi tiết đơn (tiêu đề), thẻ Kanban, phiếu sản xuất**. Mã đơn vẫn luôn hiển thị (phụ) vì là định danh chính thức.
- **AC**: đặt tên → mọi nơi hiển thị tên + mã; bỏ trống tên → hiển thị mã đơn.

### US2 — Ghi chú đơn dạng rich content (P1)
Là **quản lý/QC**, tôi muốn ghi chú đơn có **định dạng** (in đậm, nghiêng, gạch chân, danh sách chấm/đánh số, liên kết, xuống dòng) để mô tả yêu cầu rõ ràng.
- Trình soạn thảo rich text khi **tạo/sửa đơn**.
- Ghi chú được **hiển thị có định dạng** ở **trang chi tiết đơn** (hiện đang không hiển thị).
- **AC**: ghi chú in đậm + danh sách + link lưu lại và hiển thị đúng định dạng; nội dung độc hại (`<script>`, `onerror=…`, `javascript:`) **bị loại bỏ**.

### US3 — Sửa hồ sơ nhân viên từ giao diện (P1)
Là **Admin/Kế toán (hành chính)**, tôi muốn **sửa thông tin nhân viên** (họ tên, SĐT, email, phòng ban, chức vụ, ngày vào làm, trạng thái, kỹ năng, ghi chú) ngay trên trang chi tiết NV.
- Nút "Sửa thông tin" mở form điền sẵn dữ liệu hiện tại → lưu qua `PUT /employees/:id`.
- Đổi **họ tên** thì **đồng bộ tên tài khoản đăng nhập** liên kết (nếu có).
- Chỉ **ADMIN / ACCOUNTANT** thấy nút sửa (RBAC — Hiến pháp I).
- **AC**: sửa & lưu → dữ liệu cập nhật ở chi tiết + danh sách; tên account đồng bộ.

## Requirements *(mandatory)*

- **FR-001**: `Order` MUST có trường `name` (tùy chọn). Tạo/sửa đơn lưu được `name`.
- **FR-002**: "Tên hiển thị đơn" = `name` nếu có nội dung, ngược lại = `code`, qua một **helper dùng chung** (`orderDisplayName`) áp dụng nhất quán ở danh sách / chi tiết / Kanban / phiếu in. Mã đơn vẫn hiển thị như định danh phụ.
- **FR-003**: `Order.note` MUST chấp nhận & lưu **rich content** (HTML định dạng), và **sanitize ở phía server** về whitelist an toàn (chỉ cho `p,br,b,strong,i,em,u,s,ul,ol,li,a,h3,blockquote,code`; `a` chỉ `http/https/mailto` + tự thêm `rel="noopener"`; loại bỏ mọi `script`, thuộc tính `on*`, `style`, `javascript:`).
- **FR-004**: Trang chi tiết đơn MUST hiển thị ghi chú **có định dạng** (render an toàn).
- **FR-005**: Giao diện MUST cho **sửa hồ sơ nhân viên** (các trường hồ sơ) bởi **ADMIN/ACCOUNTANT**; khi đổi họ tên thì cập nhật cả `user.name` của tài khoản liên kết.
- **FR-006**: Tương thích ngược — đơn cũ không có `name` hiển thị bằng `code`; ghi chú cũ (chuỗi thuần) hiển thị nguyên văn an toàn (escape, giữ xuống dòng).

## Success Criteria *(mandatory)*

- **SC-001**: Tạo/sửa đơn có tên → danh sách + tiêu đề chi tiết + thẻ Kanban + phiếu hiển thị tên; bỏ trống → hiển thị mã đơn.
- **SC-002**: Ghi chú với in đậm/danh sách/link lưu & hiển thị đúng định dạng ở chi tiết; payload `<script>alert(1)</script>` / `<img onerror>` bị strip (không thực thi, không lưu).
- **SC-003**: Sửa hồ sơ NV từ UI cập nhật dữ liệu (kiểm tra qua API/danh sách); đổi tên → `user.name` liên kết đổi theo.
- **SC-004**: `npm run selftest` xanh toàn bộ (bổ sung kiểm tra cho 010); `npm test` 6/6 giữ nguyên.

## Out of scope

- Ghi chú rich cho khách hàng / nhà cung cấp / nhân viên (chỉ làm **ghi chú đơn**).
- Đính kèm ảnh **trong** nội dung ghi chú (đã có khối "Ảnh đính kèm" riêng của đơn).
- Lịch sử phiên bản ghi chú / bình luận nhiều người.
- Đổi **email/role** của tài khoản trong form sửa NV (email là định danh đăng nhập; role đổi qua luồng tài khoản riêng) — chỉ sửa hồ sơ + đồng bộ tên.

## Ghi chú thiết kế (xem `plan.md`)

- Rich text: **TipTap (WYSIWYG)** ở trang tạo/sửa đơn (output HTML); an toàn nhờ **sanitize server-side bắt buộc** (whitelist) + hiển thị bằng `RichTextView` (defense-in-depth, không nạp TipTap khi chỉ xem).
- `name`/`note` đi qua `CreateOrderDto`/`UpdateOrderDto` (đã có sẵn cơ chế sửa đơn ở Phase 006).
