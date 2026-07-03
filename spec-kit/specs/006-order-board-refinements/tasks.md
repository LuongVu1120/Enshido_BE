# Tasks: Order Board & Order Management Refinements

**Branch**: `006-order-board-refinements` | **Spec**: `./spec.md` | **Plan**: `./plan.md`
**Depends on**: 001-mvp-core.

## Phase 1 — Kanban theo trạng thái đơn (P1)

- [x] T601 [API] Bảng `board_columns` (status/label/position/visible) + migration + seed 6 cột mặc định; gỡ bỏ `GET /production/kanban` + `kanban()` cũ. *(FR-002)*
- [x] T602 [API] `GET /production/board` (nhóm đơn theo cột đang hiển thị; card theo đơn) + `GET/POST/PUT/DELETE /production/board/columns` (cấu hình cột, RBAC Admin/Quản lý). *(FR-001/002)*
- [x] T603 [WEB] Viết lại `/kanban` thành **order board**: cột = trạng thái đơn (từ `board_columns`), kéo–thả gọi `POST /orders/{id}/status`; FE chặn cột không hợp lệ theo `ORDER_STATUS_TRANSITIONS`. *(FR-001)*
- [x] T604 [WEB] Panel **Cấu hình cột**: thêm/ẩn/đổi tên/kéo sắp xếp cột. *(FR-002)*
- [x] T605 [TEST] Kéo hợp lệ → đổi trạng thái + audit; kéo không hợp lệ → 400/chặn; thêm/ẩn cột phản ánh đúng; `GET /production/kanban` đã gỡ (404). *(SC-001/004)*

**Checkpoint 1**: bảng đơn Todo/Doing/Done kéo–thả đổi trạng thái đúng; cột cấu hình được; không còn Kanban công đoạn.

## Phase 2 — Hoàn thiện quản lý đơn (P1)

- [x] T610 [API] Mở rộng `PUT /orders/{id}` nhận `items` (thêm/sửa/xóa) khi đơn ở trạng thái cho sửa; ghi audit. *(FR-003)*
- [x] T611 [WEB] Form **sửa đơn + sản phẩm** ở chi tiết đơn (khóa khi đã vào SX). *(FR-003)*
- [x] T612 [WEB] Component **upload ảnh** (mẫu SP / ảnh lỗi QC) dùng `POST /attachments`; hiển thị ảnh ở chi tiết. *(FR-004)*
- [x] T613 [WEB] Trang **chi tiết khách** `/customers/[id]` + lịch sử đơn. *(FR-005)*
- [x] T614 [TEST] Sửa đơn/SP phản ánh đúng + đơn đã SX không sửa được; chi tiết khách khớp dữ liệu. *(SC-002/003)*

## Phase 3 — Lọc & Xuất (P2)

- [x] T620 [API] `GET /orders/export.csv` theo bộ lọc; thêm lọc ưu tiên/đơn-trễ + sắp xếp. *(FR-006)*
- [x] T621 [WEB] Bộ lọc nâng cao + nút Xuất CSV ở danh sách đơn. *(FR-006)*

## Map US → Tasks

| US | Tasks |
|---|---|
| US1 | T601–T605 |
| US2 | T610–T614 |
| US3 | T620, T621 |
