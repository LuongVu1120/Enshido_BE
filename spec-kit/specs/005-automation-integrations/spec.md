# Feature Specification: Automation & Integrations — Tự động hóa & tích hợp

**Feature Branch**: `005-automation-integrations`

**Created**: 2026-06-09

**Status**: Draft

**Input**: Tài liệu "Giai đoạn 4: Tự động hóa".

**Depends on**: `001`–`004` (đây là lớp trên cùng, dùng dữ liệu sản xuất, tồn kho, báo cáo, nhân sự).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cảnh báo nguy cơ trễ đơn (Priority: P2)

Hệ thống chủ động cảnh báo các đơn có nguy cơ trễ dựa trên tiến độ công đoạn so với deadline.

**Why this priority**: Giảm đơn trễ — giá trị quản trị cao; xây trên dữ liệu sản xuất sẵn có.

**Independent Test**: Tạo đơn có tiến độ chậm so với deadline, xác nhận xuất hiện cảnh báo "nguy cơ trễ" trên dashboard/đơn.

**Acceptance Scenarios**:

1. **Given** đơn còn nhiều công đoạn nhưng sắp tới deadline, **When** hệ thống đánh giá, **Then** đơn được gắn cảnh báo "nguy cơ trễ" kèm lý do (công đoạn còn lại / tốc độ hiện tại).

---

### User Story 2 - Gợi ý phân công thợ (Priority: P2)

Gợi ý thợ phù hợp cho công đoạn dựa trên tải việc hiện tại và kỹ năng.

**Independent Test**: Với vài thợ có tải khác nhau, mở gợi ý phân công và xác nhận ưu tiên thợ ít tải/đúng kỹ năng.

**Acceptance Scenarios**:

1. **Given** một công đoạn cần phân công, **When** mở gợi ý, **Then** hệ thống đề xuất danh sách thợ xếp theo độ phù hợp (tải + kỹ năng).

---

### User Story 3 - Tính KPI & lương theo sản lượng (Priority: P2)

Tự động tính KPI và phần lương theo sản lượng từ dữ liệu công đoạn/QC + khung lương (004).

**Why this priority**: Tự động hóa nghiệp vụ thủ công ở phase 003/004.

**Independent Test**: Với dữ liệu sản lượng tháng, chạy tính KPI/lương và đối chiếu với công thức cấu hình.

**Acceptance Scenarios**:

1. **Given** dữ liệu sản lượng + khung lương, **When** chạy kỳ tính lương, **Then** KPI và lương theo sản lượng được tính đúng cho từng thợ và truy ngược được nguồn số liệu.

---

### User Story 4 - Tính giá vốn sản phẩm (Priority: P2)

Tính giá vốn từ vật tư đã xuất (002) + công thợ + hao hụt kim loại.

**Independent Test**: Cho một đơn đã xuất vật tư và có công đoạn/hao hụt, tính giá vốn và đối chiếu các thành phần.

**Acceptance Scenarios**:

1. **Given** đơn hoàn tất có dữ liệu vật tư + công + hao hụt, **When** tính giá vốn, **Then** hệ thống trả giá vốn kèm phân rã thành phần.

---

### User Story 5 - Tích hợp sàn TMĐT & kế toán (Priority: P3)

Kết nối Shopee/Lazada/TikTok Shop (đơn bán) và/hoặc phần mềm kế toán.

**Independent Test**: Cấu hình một kết nối thử nghiệm và đồng bộ một đơn/bút toán mẫu.

**Acceptance Scenarios**:

1. **Given** một kết nối đã cấu hình, **When** đồng bộ, **Then** dữ liệu đơn/bút toán ánh xạ đúng và ghi nhật ký đồng bộ.

### Edge Cases

- Mô hình cảnh báo trễ báo nhầm (false positive) → cho điều chỉnh ngưỡng.
- Đổi khung lương giữa kỳ → tính lương theo cấu hình hiệu lực tại thời điểm.
- API sàn TMĐT thay đổi/giới hạn rate → retry + ghi log, không trùng dữ liệu.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST cảnh báo đơn có nguy cơ trễ dựa trên tiến độ công đoạn vs deadline.
- **FR-002**: Hệ thống MUST gợi ý phân công thợ theo tải việc + kỹ năng.
- **FR-003**: Hệ thống MUST tính KPI và lương theo sản lượng, truy ngược được nguồn số liệu.
- **FR-004**: Hệ thống MUST tính giá vốn sản phẩm (vật tư + công + hao hụt) với phân rã thành phần.
- **FR-005**: Hệ thống SHOULD hỗ trợ tích hợp sàn TMĐT và/hoặc phần mềm kế toán, có nhật ký đồng bộ.
- **FR-006**: Quy tắc/ngưỡng tự động (trễ đơn, lương, giá vốn) MUST cấu hình được mà không sửa code.

### Key Entities

- Dựa trên dữ liệu hiện có: `orders`, `production_steps`, `qc_records`, `weight_logs`, `inventory_transactions`, `employees`, `payroll`.
- **AlertRule**: ngưỡng/cấu hình cảnh báo (trễ đơn, hao hụt).
- **KpiRule / CostingRule**: công thức tính KPI/lương/giá vốn.
- **Integration**: cấu hình kết nối ngoài + log đồng bộ.

## Success Criteria *(mandatory)*

- **SC-001**: ≥ 80% đơn thực tế bị trễ được cảnh báo trước khi tới hạn trên tập đánh giá.
- **SC-002**: KPI/lương theo sản lượng khớp công thức cấu hình 100% và truy ngược được nguồn.
- **SC-003**: Giá vốn tính ra phân rã đủ 3 thành phần (vật tư, công, hao hụt) cho đơn kiểm thử.
- **SC-004**: Đồng bộ tích hợp không tạo bản ghi trùng khi chạy lại (idempotent).

## Assumptions

- Đây là phase mở rộng cuối; chỉ làm khi 001–004 ổn định.
- Phạm vi tích hợp cụ thể (sàn nào, phần mềm kế toán nào) cần `/speckit.clarify` chốt trước khi plan.
- Mô hình "gợi ý/cảnh báo" bắt đầu bằng luật (rule-based), có thể nâng lên ML sau.
