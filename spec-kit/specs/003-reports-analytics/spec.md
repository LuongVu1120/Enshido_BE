# Feature Specification: Reports & Analytics — Báo cáo nâng cao

**Feature Branch**: `003-reports-analytics`

**Created**: 2026-06-09

**Status**: Draft

**Input**: Tài liệu mục 3.11 + 3.1 (dashboard) + mockup Dashboard. Phạm vi "Giai đoạn 3: Báo cáo nâng cao".

**Depends on**: `001-mvp-core` (dữ liệu đơn/sản xuất/QC/hao hụt), `002-inventory` (báo cáo tồn kho).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Báo cáo đơn hàng & sản xuất (Priority: P1)

Chủ xưởng/Kế toán xem báo cáo đơn theo trạng thái/khách/kênh, đơn trễ, thời gian xử lý TB; sản lượng theo ngày/công đoạn, công đoạn đang tắc.

**Why this priority**: Báo cáo vận hành cốt lõi để ra quyết định.

**Independent Test**: Với dữ liệu mẫu, lọc theo khoảng ngày và đối chiếu số liệu báo cáo với dữ liệu gốc.

**Acceptance Scenarios**:

1. **Given** dữ liệu đơn nhiều trạng thái, **When** lọc theo khoảng thời gian, **Then** báo cáo trả đúng tổng đơn theo trạng thái/khách/kênh và danh sách đơn trễ.
2. **Given** dữ liệu công đoạn, **When** mở báo cáo sản xuất, **Then** hiển thị sản lượng/ngày, sản lượng theo công đoạn, công đoạn đang tắc, thời gian TB mỗi công đoạn.

---

### User Story 2 - Báo cáo QC (Priority: P1)

Xem tỷ lệ pass/fail, lỗi theo công đoạn/thợ/sản phẩm/khách, số lần làm lại.

**Independent Test**: Tạo các bản ghi QC pass/fail và đối chiếu tỷ lệ + phân rã lỗi.

**Acceptance Scenarios**:

1. **Given** các bản ghi QC, **When** mở báo cáo QC, **Then** hiển thị đúng tỷ lệ pass/fail và phân rã lỗi theo các chiều.

---

### User Story 3 - Báo cáo hao hụt trọng lượng (Priority: P1)

Tổng kim loại đưa vào/thành phẩm/hao hụt; tỷ lệ hao hụt TB; hao hụt theo công đoạn/thợ/loại sản phẩm; danh sách đơn vượt định mức.

**Why this priority**: Trọng tâm kiểm soát thất thoát kim loại quý.

**Independent Test**: Với chuỗi `weight_logs`, kiểm tra tổng hao hụt và danh sách vượt định mức khớp dữ liệu.

**Acceptance Scenarios**:

1. **Given** dữ liệu cân, **When** mở báo cáo hao hụt, **Then** tổng hao hụt và tỷ lệ TB tính đúng; danh sách đơn vượt định mức đầy đủ.

---

### User Story 4 - Báo cáo năng suất thợ (Priority: P2)

Tổng sản phẩm hoàn thành, đúng hạn, tỷ lệ lỗi, hiệu suất, xếp hạng thợ.

**Acceptance Scenarios**:

1. **Given** dữ liệu công đoạn theo thợ, **When** mở báo cáo năng suất, **Then** hiển thị xếp hạng + các chỉ số theo từng thợ.

---

### User Story 5 - Báo cáo tồn kho (Priority: P2)

Tồn hiện tại, vật tư sắp hết, lịch sử nhập–xuất, vật tư tiêu hao nhiều nhất, tồn theo nhóm, giá trị tồn.

**Depends on**: `002-inventory`.

**Acceptance Scenarios**:

1. **Given** dữ liệu tồn kho, **When** mở báo cáo, **Then** hiển thị đúng tồn theo nhóm và vật tư tiêu hao nhiều nhất.

---

### User Story 6 - Dashboard nâng cao (Priority: P2)

Hoàn thiện dashboard đầy đủ biểu đồ như mockup: tiến độ theo công đoạn, tỷ lệ QC, sản lượng 7 ngày, hao hụt theo thời gian, năng suất thợ, cơ cấu tồn kho, hoạt động gần đây.

**Acceptance Scenarios**:

1. **Given** dữ liệu vận hành, **When** mở dashboard, **Then** mọi thẻ chỉ số + biểu đồ khớp dữ liệu và cập nhật theo bộ lọc ngày.

---

### User Story 7 - Xuất Excel/PDF (Priority: P3)

Xuất mọi báo cáo ra Excel/PDF.

**Acceptance Scenarios**:

1. **Given** một báo cáo đang xem, **When** bấm xuất Excel/PDF, **Then** file tải về phản ánh đúng bộ lọc hiện tại.

### Edge Cases

- Khoảng thời gian không có dữ liệu → hiển thị rỗng có nghĩa, không lỗi.
- Báo cáo nặng (nhiều tháng) → chạy nền/cache, không treo UI.
- Dữ liệu lệch múi giờ → chuẩn hóa theo giờ địa phương.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST cung cấp báo cáo đơn hàng theo trạng thái/khách/kênh/đơn trễ + thời gian xử lý TB.
- **FR-002**: Hệ thống MUST cung cấp báo cáo sản xuất (sản lượng/ngày, theo công đoạn, công đoạn tắc, thời gian TB).
- **FR-003**: Hệ thống MUST cung cấp báo cáo QC (pass/fail; lỗi theo công đoạn/thợ/sản phẩm/khách; số lần làm lại).
- **FR-004**: Hệ thống MUST cung cấp báo cáo hao hụt (tổng vào/ra/hao hụt; tỷ lệ TB; theo công đoạn/thợ/loại SP; danh sách vượt định mức).
- **FR-005**: Hệ thống MUST cung cấp báo cáo năng suất thợ và báo cáo tồn kho.
- **FR-006**: Hệ thống MUST hoàn thiện dashboard với đầy đủ biểu đồ theo mockup, có bộ lọc theo ngày.
- **FR-007**: Hệ thống SHOULD cho xuất Excel/PDF mọi báo cáo theo bộ lọc đang áp dụng.
- **FR-008**: Báo cáo nặng SHOULD chạy nền (job) và/hoặc cache để không chặn UI.

### Key Entities

- Tận dụng dữ liệu hiện có: `orders`, `production_steps`, `qc_records`, `weight_logs`, `inventory_*`, `users`.
- **ReportSnapshot** *(tùy chọn)*: cache kết quả báo cáo nặng theo bộ lọc + thời điểm.

## Success Criteria *(mandatory)*

- **SC-001**: Số liệu báo cáo khớp 100% với dữ liệu nguồn trên tập kiểm thử.
- **SC-002**: Báo cáo theo khoảng 1 tháng trả kết quả trong ≤ 3 giây (có cache) hoặc chạy nền có thông báo.
- **SC-003**: File Excel/PDF xuất ra phản ánh đúng bộ lọc đang xem.
- **SC-004**: Dashboard cập nhật theo bộ lọc ngày mà không tải lại toàn trang.

## Assumptions

- API theo tài liệu mục 6.9 (`/reports/...`).
- Không yêu cầu BI/warehouse riêng ở giai đoạn này; tổng hợp trực tiếp từ PostgreSQL (+ cache Redis).
- Báo cáo tồn kho chỉ đầy đủ khi phase `002-inventory` đã xong.
