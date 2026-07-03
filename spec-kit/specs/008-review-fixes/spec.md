# Feature Specification: Review Fixes (UX · RBAC · Worker)

**Feature Branch**: `008-review-fixes`
**Created**: 2026-06-17
**Status**: Draft
**Input**: Kết quả rà soát tính năng cũ — chốt làm nhóm 🔴 (1–4) + 🟠 (5–8).
**Depends on**: 001–007.

## User Stories *(mandatory)*

### US1 — Phiên đăng nhập không văng giữa chừng (P1)
Access token hết hạn (15') → hệ thống tự dùng refresh token gia hạn, người dùng không bị đăng xuất đột ngột.
- **AC**: Khi 1 request trả 401 do hết hạn, client tự gọi `/refresh` rồi thử lại; chỉ về `/login` khi refresh cũng hỏng.

### US2 — QC đính kèm ảnh lỗi (P1)
QC chọn FAIL có thể **tải ảnh lỗi**; ảnh lưu vào bản ghi QC, xem lại được.
- **AC**: Form QC FAIL có nút tải ảnh; ảnh đã tải nằm trong `qc_records.imageUrls`.

### US3 — Màn "Việc của tôi" cho thợ (P1)
Thợ thấy danh sách **công đoạn đang được gán cho mình** (đơn đang chạy) + mở quét nhanh.
- **AC**: `GET /production/my-tasks` trả công đoạn active gán cho user hiện tại; có nav cho Thợ.

### US4 — Onboarding env (P1)
Clone mới chạy được: có `api/.env.example` + hướng dẫn copy.
- **AC**: `cp api/.env.example api/.env` → `db:migrate` chạy.

### US5 — Tự đổi mật khẩu (P2)
Người đang đăng nhập tự đổi mật khẩu (nhập mật khẩu cũ + mới).
- **AC**: `POST /me/change-password` xác minh mật khẩu cũ; sai cũ → 400; đổi xong đăng nhập bằng mật khẩu mới.

### US6 — Siết RBAC đọc (P2)
Giới hạn đọc dữ liệu nhạy cảm theo vai trò (Thợ không tải được toàn bộ đơn/CSV).
- **AC**: `GET /orders*`, `/orders/export`, `GET weight-logs`, `POST /attachments` khai báo `@Roles`; Thợ gọi `GET /orders` → 403.

### US7 — Nhập trọng lượng từ desktop (P2)
Quản lý/QC nhập bản ghi cân từ chi tiết đơn (không chỉ màn thợ).
- **AC**: Chi tiết đơn có form thêm cân → `POST /orders/{id}/weight-logs` (tính hao hụt như cũ).

### US8 — Phân trang danh sách (P2)
Tồn kho & Nhân sự có phân trang.
- **AC**: API + UI phân trang; trang không tải toàn bộ một lần.

## Requirements
- **FR-001..008** tương ứng US1..US8 ở trên.

## Success Criteria
- **SC-001**: Hết access token → tự gia hạn, không văng (trừ khi refresh hỏng).
- **SC-002**: Thợ bị chặn đọc `GET /orders` (403); nhân viên hợp lệ vẫn đọc được.
- **SC-003**: Đổi mật khẩu: cũ sai→400; đổi xong mật khẩu mới đăng nhập được, cũ hết hiệu lực.
- **SC-004**: QC FAIL lưu được ảnh; my-tasks trả đúng công đoạn của thợ.

## Assumptions
- Không đổi data model (trừ không có). Tái dùng `/refresh`, `attachments`, `weight-logs` sẵn có.
- RBAC đọc đơn: ADMIN/Quản lý/Kế toán/QC/Kho (trừ Thợ — thợ dùng my-tasks + scan).
