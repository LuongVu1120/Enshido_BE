# Feature Specification: Order Board & Order Management Refinements

**Feature Branch**: `006-order-board-refinements`

**Created**: 2026-06-10

**Status**: Draft

**Input**: Phản hồi review của chủ dự án về **Quản lý đơn hàng** và **Kanban sản xuất**. Đây là **phase tinh chỉnh** (refinement) cho phần đã giao ở `001-mvp-core`, ưu tiên sửa cho đúng ý thay vì thêm tính năng mới.

**Depends on**: `001-mvp-core`.

## Hiện trạng (kết quả review)

| Phần | Hiện trạng (đã build ở 001) | Vấn đề cần chỉnh |
|---|---|---|
| **Kanban sản xuất** | Cột = **9 công đoạn** (Thiết kế 3D → Nhập kho TP); thẻ đơn nằm ở cột = công đoạn hiện tại; kéo thẻ = đánh dấu công đoạn DONE. | ❗ **Sai mô hình mong muốn → BỎ HẲN.** Thay bằng **bảng trạng thái ĐƠN HÀNG** kiểu Todo/Doing/Done (cột = *trạng thái đơn*, **cấu hình được**: thêm/xóa/đổi tên/sắp xếp), kéo thẻ = **đổi trạng thái đơn**. |
| **Quản lý đơn hàng** | Tạo đơn (đa SP), danh sách (lọc/tìm/phân trang), chi tiết (cấu hình công đoạn, đổi trạng thái, hủy, in phiếu). | Thiếu: **sửa thông tin đơn + sản phẩm** sau khi tạo (API `PUT /orders/{id}` có nhưng chưa có form); **upload ảnh mẫu/ảnh lỗi** (API có, UI chưa dùng); **trang chi tiết khách + lịch sử đơn** (API có, chưa có trang). |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Kanban theo trạng thái đơn hàng (Priority: P1)

Quản lý nhìn bảng các **đơn hàng** xếp theo **cột trạng thái** (kiểu Todo/Doing/Done), kéo–thả thẻ đơn giữa các cột để **đổi trạng thái đơn**, có lọc và cảnh báo.

**Why this priority**: Đây là cách quản lý muốn theo dõi tiến độ đơn (vòng đời đơn), khác với theo dõi công đoạn nội bộ.

**Independent Test**: Mở bảng, kéo một đơn từ "Chờ sản xuất" → "Đang sản xuất", xác nhận trạng thái đơn đổi đúng + ghi nhật ký; kéo sang trạng thái không hợp lệ thì bị chặn.

**Acceptance Scenarios**:

1. **Given** bảng có cột theo trạng thái đơn (mặc định: Chờ SX · Đang SX · Chờ QC · Cần sửa · Hoàn thành SX · Đã nhập kho), **When** kéo thẻ đơn sang cột kế hợp lệ, **Then** trạng thái đơn cập nhật theo **state-machine** và ghi `activity_logs`.
2. **Given** kéo sang cột **không hợp lệ** theo state-machine (vd Chờ SX → Hoàn thành), **When** thả, **Then** hệ thống chặn và thẻ trở về cột cũ + báo lý do.
3. **Given** đơn trễ hạn hoặc hao hụt vượt mức, **When** xem thẻ, **Then** thẻ có cảnh báo tương ứng (giữ từ 001).
4. **Given** Admin/Quản lý cấu hình cột, **When** **thêm** một cột (chọn trạng thái đơn chưa hiển thị) / **xóa (ẩn)** / **đổi tên** / **kéo sắp xếp lại** cột, **Then** cấu hình được lưu và bảng hiển thị theo cấu hình mới.

---

### User Story 2 - Hoàn thiện quản lý đơn hàng (Priority: P1)

Quản lý sửa được thông tin đơn và sản phẩm khi đơn chưa vào sản xuất, đính kèm ảnh, và xem chi tiết khách kèm lịch sử đơn.

**Independent Test**: Mở đơn "Chờ sản xuất", sửa deadline + thêm/sửa 1 sản phẩm, lưu; mở chi tiết khách thấy lịch sử đơn.

**Acceptance Scenarios**:

1. **Given** đơn ở trạng thái cho sửa (Nháp/Chờ xác nhận/Chờ SX), **When** sửa thông tin đơn + sản phẩm và lưu, **Then** cập nhật đúng + ghi nhật ký; đơn đã vào SX thì khóa sửa (giữ từ 001).
2. **Given** một đơn/sản phẩm/bản ghi QC, **When** upload ảnh (mẫu/lỗi), **Then** ảnh lưu và hiển thị ở chi tiết.
3. **Given** một khách đã có đơn, **When** mở **trang chi tiết khách**, **Then** thấy thông tin khách + danh sách đơn + tổng số đơn.

---

### User Story 3 - Lọc/sắp xếp & xuất danh sách đơn (Priority: P2)

Lọc nâng cao (ưu tiên, đơn trễ), sắp xếp theo deadline/ngày tạo, xuất CSV danh sách đơn theo bộ lọc.

**Acceptance Scenarios**:

1. **Given** danh sách đơn, **When** lọc "chỉ đơn trễ" + sắp xếp theo deadline, **Then** kết quả đúng.
2. **Given** bộ lọc hiện tại, **When** bấm Xuất CSV, **Then** file phản ánh đúng bộ lọc.

### Edge Cases

- Kéo thẻ nhưng người khác vừa đổi trạng thái đơn → chống ghi đè, tải lại trạng thái mới.
- Đơn ở trạng thái cuối (Hoàn tất/Đã hủy) → không kéo được / cột chỉ đọc.
- Sửa sản phẩm đã có dữ liệu cân → cảnh báo ảnh hưởng số liệu hao hụt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Kanban MUST hiển thị cột theo **trạng thái đơn hàng**; kéo–thả MUST đổi trạng thái đơn qua **state-machine** (chặn chuyển không hợp lệ) và ghi `activity_logs`.
- **FR-002**: Cột Kanban MUST **cấu hình được** (thêm/xóa/ẩn/đổi tên/sắp xếp) — mỗi cột ánh xạ tới một `OrderStatus` (để giữ tính toàn vẹn state-machine); cấu hình được lưu lại. Kanban cũ "theo công đoạn" **bị loại bỏ hoàn toàn**.
- **FR-003**: Hệ thống MUST cho **sửa đơn + sản phẩm** khi đơn ở trạng thái cho sửa; khóa khi đã vào sản xuất.
- **FR-004**: Hệ thống MUST cho **upload ảnh** (mẫu sản phẩm, ảnh lỗi QC) và hiển thị ở chi tiết (tái dùng `attachments`).
- **FR-005**: Hệ thống MUST có **trang chi tiết khách hàng** + lịch sử đơn.
- **FR-006**: Hệ thống SHOULD cho lọc nâng cao + xuất CSV danh sách đơn.

### Key Entities

- Tái dùng `orders`, `order_items`, `attachments`, `activity_logs`.
- **BoardColumn** *(mới)*: cấu hình cột bảng đơn — `status` (OrderStatus), `label` (tên hiển thị tùy biến), `position`, `visible`. Seed sẵn 6 cột mặc định.

## Success Criteria *(mandatory)*

- **SC-001**: Kéo–thả đổi trạng thái đơn đúng 100% theo state-machine; chuyển sai bị chặn 100%.
- **SC-002**: Sửa đơn/sản phẩm phản ánh đúng và ghi nhật ký; đơn đã SX không sửa được.
- **SC-003**: Trang chi tiết khách hiển thị đủ lịch sử đơn khớp dữ liệu.
- **SC-004**: Thêm/xóa/đổi tên/sắp xếp cột được lưu và phản ánh đúng ở bảng; không còn Kanban theo công đoạn.

## Assumptions

- Thêm 1 bảng nhỏ `board_columns` cho cấu hình cột; còn lại tái dùng data model 001.
- "Todo/Doing/Done" ánh xạ sang tập trạng thái vận hành của đơn (không tạo trạng thái mới ngoài enum `OrderStatus`). Cột tùy biến **tên** nhưng vẫn gắn 1 `OrderStatus` để kéo–thả đổi trạng thái an toàn.
- Kanban theo công đoạn (001) **bị gỡ bỏ** (cả API `GET /production/kanban` lẫn UI); không còn chế độ xem phụ.
