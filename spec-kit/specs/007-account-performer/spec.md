# Feature Specification: Account-per-Employee & Performer-based Crediting

**Feature Branch**: `007-account-performer`

**Created**: 2026-06-15

**Status**: Draft

**Input**: Yêu cầu chủ dự án — *(1) mỗi nhân sự đều được cấp tài khoản; (2) nhân sự nào quét QR tương tác công đoạn thì tính là người đó làm khâu đó.*

**Depends on**: `001-mvp-core` (scan/công đoạn), `004-hr-workforce` (nhân viên/worklog), `003`/`005` (năng suất/KPI).

## Bối cảnh (thay đổi so với hiện trạng)

| Hiện trạng | Yêu cầu mới |
|---|---|
| NV **có thể không có** account (004: `users.employeeId` tùy chọn). | **Mọi NV đều có account** — tạo NV thì tự cấp tài khoản. |
| Công đoạn ghi `assignedToId` (người **được gán** kế hoạch). Khi quét, người quét chỉ được gán nếu công đoạn **chưa** có người. Worklog/năng suất/KPI tính theo `assignedToId`. | Công đoạn ghi thêm `performedById` (**người thực hiện thực tế** = người quét QR & thao tác). Worklog/năng suất/KPI tính theo **người thực hiện**. |

> Đây **đảo lại** quyết định "account tùy chọn" ở 004. Trọng lượng (`measuredById`) và QC (`qcUserId`) vốn đã ghi người thao tác thực tế — chỉ `production_steps` cần bổ sung người thực hiện.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mỗi nhân sự đều có tài khoản (Priority: P1)

Khi tạo hồ sơ nhân viên, hệ thống **tự tạo tài khoản đăng nhập** (email + vai trò + mật khẩu mặc định) và liên kết. NV cũ chưa có account được cấp bổ sung.

**Independent Test**: Tạo NV mới → có ngay tài khoản đăng nhập được; danh sách NV không còn ai "Không có tài khoản".

**Acceptance Scenarios**:

1. **Given** form nhân viên (tên + email + vai trò), **When** lưu, **Then** sinh `NV-####` **và** một tài khoản (vai trò đã chọn, mật khẩu mặc định) liên kết 1–1; đăng nhập được ngay.
2. **Given** NV nghỉ việc, **When** đánh dấu nghỉ việc, **Then** tài khoản bị khóa (đã có ở 004), dữ liệu lịch sử giữ nguyên.
3. **Given** email đã tồn tại, **When** tạo NV, **Then** báo lỗi trùng email (không tạo trùng tài khoản).

---

### User Story 2 - Tính công theo người thực hiện thực tế (Priority: P1)

Nhân sự quét QR và thao tác (tiếp nhận/bắt đầu/hoàn thành/báo lỗi) → công đoạn ghi nhận **chính người đó** là người thực hiện; thống kê công việc tính theo người thực hiện thực tế.

**Independent Test**: Công đoạn được **gán cho thợ A**, nhưng **thợ B** quét QR và hoàn thành → công đoạn ghi người thực hiện = B; worklog/năng suất/KPI tháng tính cho **B**, không phải A.

**Acceptance Scenarios**:

1. **Given** công đoạn gán cho thợ A, **When** thợ B quét QR và bắt đầu/hoàn thành, **Then** `production_steps.performedById = B` và ghi nhật ký.
2. **Given** dữ liệu công đoạn hoàn thành, **When** xem **"công việc theo tháng"** của một NV / báo cáo năng suất / KPI, **Then** số liệu tính theo **người thực hiện thực tế** (performedById), khớp 100% giữa worklog ↔ năng suất ↔ KPI.
3. **Given** chi tiết đơn, **When** xem một công đoạn, **Then** thấy **cả** "người được gán" (kế hoạch) lẫn "người thực hiện" (thực tế) nếu khác nhau.

### Edge Cases

- Người bắt đầu ≠ người hoàn thành công đoạn → tính cho **người hoàn thành** (DONE) là người làm khâu đó; lần tương tác cuối cập nhật performedById.
- Công đoạn QC trả về rồi người khác sửa → người sửa lần này là người thực hiện cho lần làm lại đó.
- Dữ liệu cũ (trước 007) chưa có performedById → **backfill** = assignedToId để báo cáo lịch sử không vỡ.

## Requirements *(mandatory)*

- **FR-001**: Tạo nhân viên MUST tự tạo tài khoản (email duy nhất + vai trò + mật khẩu mặc định) liên kết 1–1; mọi NV đều có account.
- **FR-002**: Có lệnh/luồng cấp tài khoản cho NV cũ chưa có account (backfill).
- **FR-003**: `production_steps` MUST có `performedById`; set = người quét QR khi tiếp nhận/bắt đầu/hoàn thành/báo lỗi (người tương tác cuối; người hoàn thành là người được tín công).
- **FR-004**: Worklog (004), báo cáo năng suất (003), KPI/lương (005) MUST tính theo `performedById` (người thực hiện thực tế).
- **FR-005**: Giữ `assignedToId` (kế hoạch) để gợi ý phân công/tải việc; UI hiển thị phân biệt gán vs thực hiện.
- **FR-006**: Backfill `performedById = assignedToId` cho công đoạn DONE đã có.

## Key Entities

- **User/Employee**: quan hệ 1–1 **bắt buộc** (mỗi Employee có 1 User).
- **ProductionStep**: thêm `performedById` (người thực hiện thực tế) bên cạnh `assignedToId` (người được gán).

## Success Criteria *(mandatory)*

- **SC-001**: 100% nhân viên có tài khoản đăng nhập (không còn NV thiếu account).
- **SC-002**: Khi B (khác người được gán) hoàn thành công đoạn, 100% trường hợp công được tính cho **B**.
- **SC-003**: Worklog ↔ năng suất ↔ KPI khớp nhau theo người thực hiện cho cùng kỳ.

## Assumptions

- Mật khẩu cấp account là **ngẫu nhiên mỗi người**, hiển thị **1 lần** khi tạo/cấp; Admin có chức năng **reset mật khẩu** (sinh mới, hiện 1 lần).
- Vai trò account chọn khi tạo NV (mặc định Thợ sản xuất).
- Không bỏ `assignedToId`; performer là lớp bổ sung.
