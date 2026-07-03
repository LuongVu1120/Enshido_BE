<!--
SYNC IMPACT REPORT
- Version: 1.0.0 (initial ratification)
- Principles: 7 (Role-Based Access · Audit & Traceability · Weight/Loss Integrity ·
  Mobile-First cho Thợ · Spec-Driven Incremental · Security by Default · Performance & Realtime)
- Templates aligned: spec-template.md, plan-template.md (Constitution Check gate)
- Follow-up TODOs: none
-->

# Hiến pháp dự án — ENSHIDO Jewelry Production System

Tài liệu này định nghĩa các **nguyên tắc nền tảng** mà mọi `spec`, `plan`, `tasks` và phần `implement` phải tuân theo. Khi có xung đột giữa yêu cầu cụ thể và hiến pháp, hiến pháp thắng — hoặc phải ghi nhận ngoại lệ ở mục *Complexity Tracking* của plan.

## Core Principles

### I. Phân quyền theo vai trò (Role-Based Access, least-privilege)

Mỗi vai trò chỉ thấy và thao tác đúng chức năng cần thiết. Hệ thống có 6 vai trò chuẩn: Admin/Chủ xưởng, Quản lý sản xuất, Thợ sản xuất, Nhân viên QC, Nhân viên kho, Kế toán/Hành chính.

- Phân quyền **MUST** được kiểm soát ở phía server (không chỉ ẩn UI).
- Mọi endpoint **MUST** khai báo vai trò được phép.
- Tài khoản nhân viên nghỉ việc **MUST** có thể bị khóa, không xóa cứng.

*Lý do*: dữ liệu sản xuất, trọng lượng vàng/bạc và giá vốn là nhạy cảm; lộ/sửa sai gây thiệt hại trực tiếp.

### II. Truy vết & nhật ký không thể sửa (Audit & Traceability)

Mọi thay đổi quan trọng phải truy được "ai – làm gì – khi nào".

- `activity_logs` **MUST** là append-only (không cho xóa/sửa).
- Hệ thống **MUST** ghi lại: mọi đổi trạng thái đơn, người nhập trọng lượng, người QC, người sửa dữ liệu, ai đã quét QR.
- Mỗi bản ghi **MUST** lưu giá trị cũ/mới khi cập nhật dữ liệu nhạy cảm.

*Lý do*: tranh chấp hao hụt vàng/lỗi sản phẩm cần bằng chứng; minh bạch nội bộ.

### III. Toàn vẹn trọng lượng & hao hụt (Weight/Loss Integrity)

Trọng lượng và hao hụt là dữ liệu cốt lõi của xưởng kim hoàn, không được tính sai hay chỉnh lén.

- Công thức **MUST** thống nhất: hao hụt(g) = TL trước − TL sau; tỷ lệ(%) = hao hụt/TL trước × 100; lũy kế = TL ban đầu − TL hiện tại.
- Khi vượt **định mức hao hụt cho phép**, hệ thống **MUST** cảnh báo và nêu rõ công đoạn + người thực hiện + chênh lệch.
- Lịch sử cân **MUST** bất biến; sửa sai phải tạo bản ghi điều chỉnh có lý do, không ghi đè.

*Lý do*: kiểm soát thất thoát kim loại quý là mục tiêu sống còn của phần mềm.

### IV. Ưu tiên trải nghiệm thợ trên mobile (Mobile-First cho Thợ)

Thợ thao tác tại bàn máy bằng điện thoại; mọi chậm trễ làm gián đoạn sản xuất.

- Màn hình thợ **MUST** hoàn tất một thao tác cập nhật công đoạn trong **3–5 giây**.
- Quét QR **MUST** mở đúng đơn và đúng công đoạn hiện tại.
- Giao diện thợ **MUST** ít chữ, nút lớn, dùng tốt một tay.

*Lý do*: tài liệu yêu cầu rõ "thợ thao tác được trong 3–5 giây".

### V. Phát triển theo spec, tăng dần (Spec-Driven & Incremental)

Tuân thủ quy trình spec-kit; xây theo lát cắt giá trị.

- Mỗi phase/feature **MUST** chia user story độc lập, gắn ưu tiên P1/P2/P3; **P1 phải tạo được MVP chạy được**.
- Logic nghiệp vụ rủi ro cao (tính hao hụt, định tuyến QC trả lỗi, sinh mã/QR) **MUST** có test trước khi hoặc song song khi cài đặt.
- Không thêm tính năng ngoài spec đang làm (tránh over-engineering); muốn thêm phải cập nhật spec.

*Lý do*: dự án lớn, nhiều module; cắt nhỏ giúp giao hàng sớm và giảm rủi ro.

### VI. An toàn mặc định (Security by Default)

- Người dùng **MUST** đăng nhập mới truy cập dữ liệu.
- QR **MUST** dùng token; **MUST NOT** nhúng trực tiếp thông tin nhạy cảm; phải vô hiệu hóa được khi hủy đơn.
- Mật khẩu **MUST** được hash (Argon2/bcrypt); secrets không commit vào repo.
- File upload (ảnh/file thiết kế) **MUST** kiểm soát loại & dung lượng.

### VII. Hiệu năng & realtime (Performance & Realtime)

- Danh sách lớn **MUST** phân trang + index; mục tiêu p95 < 300ms ở quy mô vài trăm đơn đang chạy.
- Kanban & Dashboard **SHOULD** cập nhật realtime sau khi thợ báo xong công đoạn.
- Báo cáo nặng **SHOULD** chạy nền (job) thay vì chặn request.

## Additional Constraints

- **Stack chuẩn**: TypeScript end-to-end — Next.js (web + PWA), NestJS (REST API), PostgreSQL, Redis, S3/MinIO. Lệch stack phải ghi nhận ở plan.
- **Ngôn ngữ**: tiếng Việt là ngôn ngữ chính của giao diện.
- **Quy ước mã**: `SX-YYYYMMDD-####` (đơn), `PSX-YYYYMMDD-####` (phiếu), `KH-######` (khách), `VT-######` (vật tư).
- **Backup**: dữ liệu PostgreSQL phải được sao lưu định kỳ.

## Governance

- Hiến pháp này có hiệu lực cao nhất đối với mọi quyết định kỹ thuật trong dự án.
- Mọi `/speckit.plan` **MUST** vượt qua *Constitution Check* trước khi sang phần thiết kế; vi phạm phải được liệt kê & biện minh ở *Complexity Tracking*.
- Sửa đổi hiến pháp: cập nhật phiên bản theo SemVer — MAJOR (thay đổi/loại bỏ nguyên tắc), MINOR (thêm nguyên tắc/mục), PATCH (làm rõ câu chữ) — và ghi lý do.

**Version**: 1.0.0 | **Ratified**: 2026-06-09 | **Last Amended**: 2026-06-09
