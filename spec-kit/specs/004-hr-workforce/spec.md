# Feature Specification: HR & Workforce — Nhân sự, chấm công, lương

**Feature Branch**: `004-hr-workforce`

**Created**: 2026-06-09

**Status**: Draft

**Input**: Mockup "Quản lý nhân sự" (phòng ban, chức vụ, chấm công, ca làm việc, lương thưởng, vai trò & phân quyền) + tài liệu mục 2 (nhóm người dùng) & 4.1 (màn hình nhân sự/phân quyền).

**Depends on**: `001-mvp-core` (users/roles). Liên kết số liệu sản lượng với `003-reports-analytics`.

> ⚠️ **Cập nhật bởi `007-account-performer`**: quyết định "account tùy chọn" ở phase này **bị thay thế** — **mọi nhân viên đều có tài khoản** (tạo NV tự cấp account). Worklog tính theo **người thực hiện thực tế** (`production_steps.performedById`), không theo người được gán.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hồ sơ nhân viên (Priority: P1)

Hành chính/Admin quản lý nhân viên: mã NV, phòng ban, chức vụ, SĐT, email, ngày vào làm, trạng thái (đang làm/tạm nghỉ/nghỉ việc).

**Why this priority**: Là danh bạ nền cho gán việc, chấm công, lương; mở rộng từ `users` của MVP.

**Independent Test**: Tạo nhân viên (sinh mã `NV-####`), gán phòng ban + chức vụ, lọc theo phòng ban/chức vụ/trạng thái; thống kê nhân sự theo phòng ban.

**Acceptance Scenarios**:

1. **Given** form nhân viên, **When** lưu với phòng ban + chức vụ + ngày vào làm, **Then** sinh `NV-####` và hiển thị ở danh sách + thống kê theo phòng ban.
2. **Given** nhân viên nghỉ việc, **When** đánh dấu nghỉ việc, **Then** tài khoản bị khóa đăng nhập nhưng dữ liệu lịch sử (đã làm công đoạn, QC) vẫn còn.

---

### User Story 2 - Vai trò & phân quyền nâng cao (Priority: P1)

Admin cấu hình vai trò và tập quyền chi tiết theo chức năng (mở rộng RBAC cơ bản của MVP).

**Why this priority**: Khi tổ chức lớn lên cần phân quyền mịn hơn 6 vai trò mặc định.

**Independent Test**: Tạo vai trò mới, bật/tắt quyền theo module, gán cho nhân viên và kiểm tra hiệu lực ở UI + API.

**Acceptance Scenarios**:

1. **Given** một vai trò tùy chỉnh, **When** bật/tắt quyền theo module và gán cho nhân viên, **Then** nhân viên chỉ truy cập đúng chức năng được phép (kiểm soát ở server).

---

### User Story 3 - Chấm công (Priority: P2)

Theo dõi công ngày/giờ, đi muộn, về sớm cho từng nhân viên theo tháng.

**Independent Test**: Nhập/ghi nhận công cho một nhân viên, xem bảng chấm công tháng với công ngày/giờ + số lần đi muộn/về sớm.

**Acceptance Scenarios**:

1. **Given** dữ liệu chấm công, **When** mở chi tiết nhân viên, **Then** hiển thị công ngày/giờ, đi muộn, về sớm trong tháng như mockup.

---

### User Story 4 - Ca làm việc (Priority: P2)

Định nghĩa ca và phân ca cho nhân viên.

**Acceptance Scenarios**:

1. **Given** các ca đã định nghĩa, **When** phân ca cho nhân viên, **Then** lịch ca hiển thị và làm cơ sở cho chấm công.

---

### User Story 5 - Lương thưởng (Priority: P2)

Khung lương theo nhân viên; tổng hợp số liệu sản lượng (từ báo cáo 003) phục vụ tính lương/thưởng.

**Why this priority**: Tiền đề cho tính lương theo sản lượng tự động ở phase `005`.

**Independent Test**: Cấu hình khung lương cho nhân viên, kéo số liệu sản lượng tháng và xem bảng lương dự kiến (chưa tự động hóa).

**Acceptance Scenarios**:

1. **Given** khung lương + số liệu sản lượng tháng, **When** mở bảng lương, **Then** hiển thị lương cơ bản + phần theo sản lượng (nếu cấu hình) cho từng nhân viên.

### User Story 6 - Bảng công việc theo tháng của nhân viên (Priority: P1)

> **Bổ sung theo review của chủ dự án**: ưu tiên xem **"nhân viên đã làm được những gì trong tháng"**. Đây là phần P1 cốt lõi của phase này, đứng cạnh US1 (hồ sơ NV).

Quản lý/Admin mở hồ sơ một nhân viên và xem **nhật ký công việc + sản lượng theo tháng**: các công đoạn đã hoàn thành (số lượng, đúng hạn), số lần QC đã thực hiện (nếu là QC), trọng lượng đã cân & hao hụt gây ra, tỷ lệ lỗi — tổng hợp từ dữ liệu sản xuất thực tế (`production_steps`, `qc_records`, `weight_logs`).

**Why this priority**: Là thước đo đóng góp thực tế của từng người trong tháng; nền cho chấm công/lương/KPI ở 004 (P2) và 005.

**Independent Test**: Chọn một thợ + tháng, xác nhận danh sách công đoạn đã làm + tổng sản lượng/đúng hạn/hao hụt khớp với dữ liệu sản xuất nguồn.

**Acceptance Scenarios**:

1. **Given** một nhân viên có dữ liệu sản xuất trong tháng, **When** mở "Công việc trong tháng" + chọn tháng, **Then** hiển thị: số công đoạn hoàn thành, sản lượng, % đúng hạn, % lỗi, tổng hao hụt gây ra, và **danh sách chi tiết từng công đoạn** (đơn, công đoạn, thời gian, SL).
2. **Given** chuyển sang tháng khác, **When** đổi bộ lọc tháng, **Then** số liệu cập nhật theo tháng đã chọn.
3. **Given** số liệu này, **Then** phải **khớp 100%** với báo cáo năng suất (003) cho cùng kỳ.

### Edge Cases

- Nhân viên chuyển phòng ban giữa kỳ → dữ liệu lịch sử giữ nguyên theo thời điểm.
- Nghỉ việc giữa tháng → chấm công/lương tính theo số ngày thực tế.
- Một người có nhiều chức vụ/kỹ năng → phục vụ gợi ý phân công ở phase 005.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST quản lý hồ sơ nhân viên (mã `NV-####`, phòng ban, chức vụ, trạng thái) mở rộng từ `users`.
- **FR-002**: Hệ thống MUST cho khóa/đánh dấu nghỉ việc mà không mất dữ liệu lịch sử liên quan.
- **FR-003**: Hệ thống MUST hỗ trợ vai trò & phân quyền nâng cao theo module, kiểm soát ở server.
- **FR-004**: Hệ thống MUST hỗ trợ chấm công (công ngày/giờ, đi muộn, về sớm) theo tháng.
- **FR-005**: Hệ thống MUST hỗ trợ định nghĩa & phân ca làm việc.
- **FR-006**: Hệ thống MUST hỗ trợ khung lương theo nhân viên và tổng hợp số liệu sản lượng phục vụ tính lương.
- **FR-007**: Hệ thống SHOULD nhập/xuất danh sách nhân viên qua Excel (theo mockup có nút Nhập/Xuất Excel).
- **FR-008**: Hệ thống MUST hiển thị **bảng công việc/sản lượng theo tháng** cho từng nhân viên (công đoạn đã làm, sản lượng, đúng hạn, % lỗi, hao hụt gây ra), tổng hợp từ dữ liệu sản xuất và **khớp với báo cáo năng suất 003**.

### Key Entities

- **Employee**: hồ sơ nhân viên (mở rộng `users`: phòng ban, chức vụ, ngày vào làm, trạng thái, kỹ năng).
- **Department / Position**: phòng ban, chức vụ.
- **Attendance**: bản ghi chấm công (ngày, giờ vào/ra, đi muộn, về sớm).
- **Shift**: ca làm việc và phân ca.
- **PayrollConfig / PayrollRecord**: khung lương + bảng lương kỳ.
- **Role (nâng cao)**: vai trò + quyền chi tiết theo module.

## Success Criteria *(mandatory)*

- **SC-001**: 100% nhân viên nghỉ việc bị chặn đăng nhập nhưng dữ liệu lịch sử vẫn truy được.
- **SC-002**: Phân quyền tùy chỉnh có hiệu lực đúng ở cả UI lẫn API (không bypass được qua API).
- **SC-003**: Bảng chấm công tháng khớp với dữ liệu ghi nhận trên tập kiểm thử.
- **SC-004**: Số liệu sản lượng dùng cho lương khớp với báo cáo năng suất (003).
- **SC-005**: Bảng "công việc theo tháng" của mỗi nhân viên khớp 100% với dữ liệu sản xuất nguồn (`production_steps`/`qc_records`/`weight_logs`) cho cùng kỳ.

## Assumptions

- RBAC cơ bản đã có ở MVP; phase này làm phần nâng cao + nghiệp vụ nhân sự.
- Tính lương theo sản lượng **tự động** và KPI thuộc phase `005`; phase này dừng ở khung lương + tổng hợp số liệu.
- Tích hợp máy chấm công vân tay/thẻ là tùy chọn ngoài phạm vi mặc định.
