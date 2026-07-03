# Tasks: Review Fixes — ENSHIDO

**Branch**: `008-review-fixes` | **Spec**: `./spec.md`
**Depends on**: 001–007. Không đổi data model.

## 🔴 Nhóm nên sửa
- [x] T801 [WEB] `api.ts`: gặp 401 → tự gọi `/refresh` (refresh token) rồi retry request; chỉ về /login khi refresh hỏng. *(US1)*
- [x] T802 [WEB] Màn QC FAIL: gắn upload ảnh lỗi (component sẵn) → gửi `imageUrls`. *(US2)*
- [x] T803 [API] `GET /production/my-tasks`: công đoạn active gán cho user hiện tại (kèm đơn/QR). *(US3)*
- [x] T804 [WEB] Trang `/my-tasks` cho Thợ + nav; mở quét nhanh. *(US3)*
- [x] T805 `api/.env.example` + bước copy trong quickstart. *(US4)*

## 🟠 Nhóm hoàn thiện
- [x] T810 [API] `POST /me/change-password` (xác minh mật khẩu cũ, đổi mới). *(US5)*
- [x] T811 [WEB] Modal "Đổi mật khẩu" ở thanh user (mọi vai trò). *(US5)*
- [x] T812 [API] Siết `@Roles` đọc: `GET /orders*`, `/orders/export`, `GET weight-logs`, `POST /attachments`. *(US6)*
- [x] T813 [WEB] Form **nhập trọng lượng** ở chi tiết đơn (Quản lý/QC). *(US7)*
- [x] T814 [API+WEB] Phân trang Tồn kho & Nhân sự (API page/pageSize + UI). *(US8)*

## Kiểm thử
- [x] T820 [TEST] Selftest: change-password (cũ sai→400, đổi xong login mới được), my-tasks trả công đoạn của thợ, RBAC thợ đọc /orders→403, /me còn hoạt động.

## Map US → Tasks
| US | Tasks |
|---|---|
| US1 | T801 |
| US2 | T802 |
| US3 | T803, T804 |
| US4 | T805 |
| US5 | T810, T811 |
| US6 | T812 |
| US7 | T813 |
| US8 | T814 |
