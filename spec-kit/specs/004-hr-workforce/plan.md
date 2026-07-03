# Implementation Plan: HR & Workforce — ENSHIDO

**Branch**: `004-hr-workforce` | **Date**: 2026-06-10 | **Spec**: `./spec.md`
**Depends on**: `001-mvp-core` (users/roles), `003-reports-analytics` (năng suất). Stack chuẩn.

> **Cập nhật theo review**: trọng tâm P1 của phase này là **(1) Hồ sơ nhân viên** và **(2) Bảng "nhân viên đã làm gì trong tháng"** (US1 + US6). Chấm công/ca/lương là P2, tính lương tự động thuộc 005.

## Summary

Tạo **bảng `Employee` riêng** làm hồ sơ nhân viên (phòng ban, chức vụ, ngày vào làm, kỹ năng, trạng thái) — **độc lập với tài khoản đăng nhập** vì có nhân viên KHÔNG có account. `users` (account) **liên kết tùy chọn 1–1** tới `Employee`. Xây **trang nhân viên** + **bảng công việc/sản lượng theo tháng** tổng hợp từ dữ liệu sản xuất thật (`production_steps`, `qc_records`, `weight_logs`) — khớp báo cáo năng suất 003. Sau đó mới tới chấm công/ca/khung lương (P2).

## Constitution Check

| Nguyên tắc | Tuân thủ |
|---|---|
| I. RBAC | Nhân sự: Admin/Hành chính; nhân viên xem hồ sơ mình |
| II. Audit | Tạo/sửa hồ sơ, khóa/nghỉ việc ghi `activity_logs` |
| V. Spec-driven | Làm P1 (hồ sơ + worklog) trước, P2 sau |
| VII. Performance | Worklog tổng hợp theo tháng có index (assignedToId, completedAt) |

→ **PASS**.

## Data Model

| Bảng | Thay đổi |
|---|---|
| **`employees`** *(MỚI — bảng chính)* | `code` (NV-####), `name`, `phone`, `email?`, `department`, `position`, `joinDate`, `status` (đang làm/tạm nghỉ/nghỉ việc), `skills` (CSV/JSON). **Độc lập với account.** |
| `users` | + `employeeId String? @unique` — liên kết tùy chọn 1–1 tới `employees` (account ↔ nhân viên). NV không có account thì không có `users`. |
| `attendance` *(P2)* | nhân viên, ngày, giờ vào/ra, đi muộn, về sớm |
| `shift` / `shift_assignment` *(P2)* | ca + phân ca |
| `payroll_config` / `payroll_record` *(P2)* | khung lương + bảng lương kỳ |
| `roles` *(nâng cao)* | permissions chi tiết theo module (đã có cột `permissions`) |

> **Worklog & gán việc**: 001 gán việc theo `users.id` (`production_steps.assignedToId → users`). Bảng "công việc theo tháng" của một **employee** tổng hợp qua **user đã liên kết** (`employee.user`). NV không có account ⇒ hiện chưa được gán việc trong mô hình 001 ⇒ worklog rỗng. **Cân nhắc follow-up**: cho phép gán việc theo `employeeId` (đổi `production_steps` tham chiếu employee) — ghi nhận ở Complexity Tracking, KHÔNG làm trong P1 để tránh refactor 001.

## API Contracts

- **Nhân viên (P1)**: `GET/POST /employees`, `GET/PUT /employees/{id}` (sinh `NV-####`); `POST /employees/{id}/link-user` (gắn/bỏ account); đánh dấu nghỉ việc khóa luôn account liên kết (nếu có).
- **Worklog tháng (P1)**: `GET /employees/{id}/worklog?month=YYYY-MM` → tổng hợp + danh sách công đoạn/QC/cân trong tháng (tổng hợp qua `employee.user`; NV không account → rỗng). *(tái dùng logic `reports/productivity`, lọc 1 người + tháng)*
- **Chấm công/Ca/Lương (P2)**: `/attendance`, `/shifts`, `/payroll` (sau).

## Phasing (tasks)

1. **P1** Hồ sơ nhân viên (mở rộng users) + trang `/employees` + chi tiết. *(US1)*
2. **P1** Bảng công việc theo tháng `/employees/{id}` (worklog) — khớp 003. *(US6)*
3. **P2** Phân quyền nâng cao theo module. *(US2)*
4. **P2** Chấm công + ca. *(US3/US4)*
5. **P2** Khung lương + tổng hợp sản lượng (chưa tự động). *(US5)*

## Complexity Tracking

Kế thừa dev accommodations 001–003. **Quyết định review**: dùng **bảng `Employee` riêng** (không gộp vào `users`) vì có NV không có account; `users.employeeId` là liên kết tùy chọn. Hệ quả: gán việc theo `users` (001) chưa phủ NV không-account → để ngỏ "gán việc theo employee" làm follow-up (P2/005), không refactor `production_steps` trong P1.
