# Implementation Plan: Order Board & Order Management Refinements

**Branch**: `006-order-board-refinements` | **Date**: 2026-06-10 | **Spec**: `./spec.md`
**Depends on**: `001-mvp-core`. Không thêm dependency / bảng mới.

## Summary

**Gỡ bỏ** Kanban theo công đoạn, thay bằng **bảng theo trạng thái đơn hàng** (Todo/Doing/Done) với **cột cấu hình được** (thêm/xóa/đổi tên/sắp xếp) — kéo–thả đổi trạng thái đơn qua state-machine sẵn có (`ORDER_STATUS_TRANSITIONS`). Bổ sung các phần còn thiếu của **quản lý đơn**: form sửa đơn + sản phẩm, upload ảnh, trang chi tiết khách, lọc/xuất CSV.

## Constitution Check

| Nguyên tắc | Tuân thủ |
|---|---|
| I. RBAC | Kéo–thả đổi trạng thái: Quản lý/Admin; sửa đơn: Quản lý |
| II. Audit | Đổi trạng thái + sửa đơn ghi `activity_logs` (đã có) |
| VI. Security | Upload ảnh tái dùng `attachments` (kiểm soát loại/dung lượng) |
| VII. Performance | Board lấy đơn đang mở + phân nhóm phía server |

→ **PASS**.

## Thiết kế Kanban theo trạng thái đơn (FR-001/002)

**Cột MẶC ĐỊNH** (seed sẵn, admin sửa được) — ánh xạ Todo→Doing→Done bằng `OrderStatus`:

| position | label (sửa được) | status | Nhóm |
|---|---|---|---|
| 1 | Chờ sản xuất | `WAITING_PRODUCTION` | Todo |
| 2 | Đang sản xuất | `IN_PRODUCTION` | Doing |
| 3 | Chờ QC | `WAITING_QC` | Doing |
| 4 | Cần sửa | `NEEDS_REWORK` | Doing |
| 5 | Hoàn thành SX | `PRODUCTION_DONE` | Done |
| 6 | Đã nhập kho | `STOCKED` | Done |

*(Trạng thái khác có thể thêm thành cột: `QC_FAILED`, `DELIVERED`, `COMPLETED`, `CANCELLED`… Admin tự thêm/ẩn.)*

- **Bảng mới `board_columns`**: `{ id, status, label, position, visible }`. Migration + seed 6 cột mặc định.
- **API**:
  - `GET /production/board` → `{ columns: BoardColumn[], cards: [...] }`; card theo *đơn* (mã, khách, SP, ưu tiên, deadline, overdue, lossExceeded, công đoạn hiện tại để tham khảo). Chỉ nhóm đơn có `status` thuộc cột đang hiển thị.
  - `GET /production/board/columns` · `POST` (thêm) · `PUT /{id}` (đổi tên/visible/position) · `DELETE /{id}` (ẩn) — RBAC Admin/Quản lý.
- **Đổi trạng thái khi kéo**: tái dùng `POST /orders/{id}/status` (đã validate state-machine + audit). FE chặn cột không hợp lệ dựa trên `ORDER_STATUS_TRANSITIONS` (đã ở `@enshido/types`).
- **GỠ BỎ**: `GET /production/kanban` (service `kanban()` cũ) + trang Kanban-theo-công-đoạn. Không còn toggle.
- **Web**: viết lại `/kanban` thành order board + panel "Cấu hình cột" (thêm/ẩn/đổi tên/kéo sắp xếp).

## Quản lý đơn (US2/US3)

- **Sửa đơn + sản phẩm**: mở rộng `PUT /orders/{id}` để nhận `items` (thêm/sửa/xóa) khi đơn ở `EDITABLE_ORDER_STATUSES`; FE thêm form sửa ở `/orders/[id]` (hoặc `/orders/[id]/edit`).
- **Upload ảnh**: dùng `POST /attachments` (đã có) — thêm component upload ở chi tiết đơn/QC/scan; hiển thị ảnh ở chi tiết.
- **Chi tiết khách**: thêm trang `/customers/[id]` dùng `GET /customers/{id}` + `/orders`.
- **Lọc/Xuất**: thêm lọc ưu tiên/đơn-trễ + `GET /orders/export.csv`.

## Phasing (tasks)

1. `board_columns` (migration + seed) + API board + columns CRUD; gỡ `GET /production/kanban`.
2. Web: viết lại Kanban thành order board + cấu hình cột.
3. API mở rộng `PUT /orders/{id}` (items) + `GET /orders/export.csv`.
4. Web: form sửa đơn + upload ảnh + trang chi tiết khách + lọc/xuất.
5. Selftest: kéo đổi trạng thái hợp lệ/không hợp lệ; thêm/ẩn cột; sửa đơn; chi tiết khách.

## Complexity Tracking

Không vi phạm. **Quyết định review**: gỡ bỏ hẳn Kanban-theo-công-đoạn (không giữ chế độ phụ) theo yêu cầu chủ dự án — chấp nhận bỏ phần code cũ của US9/001. Thêm bảng `board_columns` để cột cấu hình được.
