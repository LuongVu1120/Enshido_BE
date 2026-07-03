# Feature Specification: Inventory — Tồn kho vật tư & thành phẩm

**Feature Branch**: `002-inventory`

**Created**: 2026-06-09

**Status**: Draft

**Input**: Tài liệu mục 3.10 + mockup "Quản lý tồn kho". Phạm vi "Giai đoạn 2: Tồn kho".

**Depends on**: `001-mvp-core` (đơn hàng, công đoạn, QC pass).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Danh mục vật tư & nhóm kho (Priority: P1)

Nhân viên kho quản lý danh mục vật tư theo nhóm: nguyên liệu, đá, phụ kiện, hóa chất xi/mạ, bao bì, bán thành phẩm, thành phẩm.

**Why this priority**: Mọi nghiệp vụ nhập/xuất đều cần danh mục vật tư trước.

**Independent Test**: Tạo vật tư mới (sinh mã `VT-######`), gán nhóm, đơn vị tính, tồn tối thiểu; hiển thị ở danh sách lọc theo nhóm/kho.

**Acceptance Scenarios**:

1. **Given** form vật tư, **When** lưu với mã/tên/nhóm/đơn vị/tồn tối thiểu/giá nhập/NCC, **Then** sinh `VT-######` và hiển thị trạng thái tồn (đủ/sắp hết/thiếu).
2. **Given** danh sách tồn kho, **When** lọc theo kho/nhóm/NCC/trạng thái hoặc tìm theo mã/tên, **Then** kết quả đúng và phân trang.

---

### User Story 2 - Nhập kho (Priority: P1)

Nhân viên kho lập phiếu nhập nguyên liệu/vật tư từ nhà cung cấp.

**Why this priority**: Tăng tồn — tiền đề để xuất cho sản xuất.

**Independent Test**: Lập phiếu nhập 1 vật tư số lượng N, xác nhận tồn hiện tại tăng N và có lịch sử giao dịch.

**Acceptance Scenarios**:

1. **Given** phiếu nhập, **When** lưu với NCC + vật tư + số lượng + đơn giá, **Then** tồn hiện tại tăng và sinh `inventory_transaction` loại "nhập".
2. **Given** có hóa đơn, **When** đính kèm file, **Then** file lưu vào phiếu nhập.

---

### User Story 3 - Xuất kho theo đơn / công đoạn (Priority: P1)

Xuất vật tư phục vụ một đơn sản xuất và/hoặc công đoạn cụ thể.

**Why this priority**: Kết nối tồn kho với sản xuất; nền cho tính giá vốn (005).

**Independent Test**: Xuất vật tư cho đơn X, xác nhận tồn giảm và giao dịch gắn `order_id`.

**Acceptance Scenarios**:

1. **Given** đơn đang sản xuất, **When** xuất vật tư cho đơn/công đoạn, **Then** tồn giảm và giao dịch ghi rõ đơn + công đoạn + người xuất.
2. **Given** tồn không đủ, **When** xuất vượt tồn, **Then** hệ thống cảnh báo/chặn theo cấu hình.

---

### User Story 4 - Nhập kho thành phẩm sau QC PASS (Priority: P1)

Khi đơn QC PASS, kho nhận thông báo và nhập thành phẩm vào kho thành phẩm.

**Why this priority**: Khép kín luồng sản xuất từ MVP (đơn → QC → kho TP).

**Independent Test**: Cho một đơn QC PASS, xác nhận xuất hiện ở hàng chờ nhập kho TP; nhập xong đơn chuyển "Đã nhập kho thành phẩm".

**Acceptance Scenarios**:

1. **Given** đơn QC PASS, **When** kho nhập thành phẩm, **Then** tồn kho thành phẩm tăng và trạng thái đơn cập nhật "Đã nhập kho thành phẩm".

---

### User Story 5 - Cảnh báo tồn tối thiểu (Priority: P2)

Hệ thống cảnh báo vật tư dưới tồn tối thiểu / sắp hết / hết hàng.

**Why this priority**: Tránh gián đoạn sản xuất; không chặn nghiệp vụ nhập–xuất cơ bản.

**Acceptance Scenarios**:

1. **Given** một vật tư xuống dưới tồn tối thiểu, **When** mở dashboard/tồn kho, **Then** vật tư hiển thị ở mục cảnh báo với mức độ phù hợp.

---

### User Story 6 - Chuyển kho (Priority: P2)

Chuyển vật tư/bán thành phẩm giữa các kho.

**Acceptance Scenarios**:

1. **Given** vật tư ở kho A, **When** chuyển sang kho B, **Then** tồn A giảm, tồn B tăng, có giao dịch "chuyển kho".

---

### User Story 7 - Định giá tồn kho (Priority: P3)

Tính giá trị tồn kho theo nhóm/tổng.

**Acceptance Scenarios**:

1. **Given** dữ liệu giá nhập, **When** xem tổng quan tồn kho, **Then** hiển thị tổng giá trị tồn theo nhóm như mockup.

### Edge Cases

- Xuất đồng thời cùng một vật tư cho nhiều đơn → tránh âm tồn.
- Hủy đơn đã xuất vật tư → xử lý hoàn/điều chỉnh tồn.
- Đơn vị tính khác nhau (kg/lượng/viên/cái/ml) → không quy đổi nhầm.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST quản lý danh mục vật tư theo 7 nhóm kho và sinh mã `VT-######`.
- **FR-002**: Hệ thống MUST hỗ trợ nhập kho (NCC, số lượng, đơn giá, đính kèm hóa đơn) và cập nhật tồn.
- **FR-003**: Hệ thống MUST hỗ trợ xuất kho gắn `order_id`/công đoạn và cập nhật tồn.
- **FR-004**: Hệ thống MUST cho nhập kho thành phẩm sau QC PASS và cập nhật trạng thái đơn.
- **FR-005**: Hệ thống MUST cảnh báo tồn dưới tối thiểu / sắp hết / hết hàng.
- **FR-006**: Hệ thống MUST hỗ trợ chuyển kho giữa các nhóm kho.
- **FR-007**: Hệ thống MUST lưu lịch sử mọi giao dịch nhập/xuất/chuyển (immutable, có người thực hiện).
- **FR-008**: Hệ thống SHOULD tính giá trị tồn kho theo nhóm/tổng.

### Key Entities

- **InventoryItem**: vật tư (mã, nhóm, đơn vị, tồn hiện tại/tối thiểu, giá nhập, NCC, vị trí, trạng thái).
- **InventoryTransaction**: giao dịch nhập/xuất/chuyển (loại, vật tư, đơn liên quan, số lượng, đơn giá, người thực hiện).
- **Supplier**: nhà cung cấp (gắn với vật tư & phiếu nhập).
- **Warehouse/Group**: nhóm kho phân loại tồn.

## Success Criteria *(mandatory)*

- **SC-001**: Sau mỗi nhập/xuất/chuyển, tồn hiện tại đúng 100% so với sổ giao dịch.
- **SC-002**: 100% giao dịch xuất cho sản xuất truy ngược được tới đơn + công đoạn.
- **SC-003**: Đơn QC PASS được phản ánh ở hàng chờ nhập kho thành phẩm trong ≤ 5 giây.
- **SC-004**: 100% vật tư dưới tồn tối thiểu xuất hiện ở danh sách cảnh báo.

## Assumptions

- Dùng `inventory_items` & `inventory_transactions` đã khai báo ở MVP, mở rộng đầy đủ tại phase này.
- API theo tài liệu mục 6.8 (`/inventory/...`).
- Quy đổi đơn vị nâng cao (vd lượng↔gram) là tùy chọn, có thể để phase sau.
