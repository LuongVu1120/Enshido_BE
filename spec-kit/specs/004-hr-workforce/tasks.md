# Tasks: HR & Workforce — ENSHIDO

**Branch**: `004-hr-workforce` | **Spec**: `./spec.md` | **Plan**: `./plan.md`
**Depends on**: 001-mvp-core, 003-reports-analytics.

> Thứ tự ưu tiên cập nhật theo review: **Hồ sơ NV (US1) + Bảng công việc theo tháng (US6)** là P1 làm trước.

## Phase 1 — Hồ sơ nhân viên (P1 · US1)

- [x] T401 [API] Bảng **`employees`** (NV-####, phòng ban, chức vụ, joinDate, status, skills) + `users.employeeId?` (liên kết 1–1 tùy chọn); migration + seed (gắn employee cho user hiện có + 1–2 NV không account).
- [x] T402 [API] `employees` endpoints: list (lọc phòng ban/chức vụ/trạng thái) + CRUD + `link-user`; nghỉ việc → khóa account liên kết (nếu có). *(FR-001/002)*
- [x] T403 [WEB] Trang **Nhân sự** `/employees` (danh sách + lọc + thống kê theo phòng ban) + form thêm/sửa + gắn account.
- [x] T404 [TEST] Sinh mã NV-; NV có account nghỉ việc → chặn đăng nhập + giữ lịch sử; NV không account vẫn quản lý được. *(SC-001)*

## Phase 2 — Bảng công việc theo tháng (P1 · US6 — trọng tâm review)

- [x] T410 [API] `GET /employees/{id}/worklog?month=YYYY-MM`: tổng hợp (công đoạn hoàn thành, sản lượng, % đúng hạn, % lỗi, hao hụt gây ra) + **danh sách chi tiết** công đoạn/QC/cân trong tháng. *(FR-008)*
- [x] T411 [API] Đảm bảo số liệu **khớp `reports/productivity`** cùng kỳ (tái dùng logic). *(SC-005)*
- [x] T412 [WEB] Trang **chi tiết nhân viên** `/employees/{id}`: chọn tháng + thẻ tổng hợp + bảng chi tiết công việc.
- [x] T413 [TEST] Worklog khớp 100% dữ liệu nguồn + khớp báo cáo 003 cho cùng tháng. *(SC-005)*

**Checkpoint (P1)**: Xem được "nhân viên X đã làm gì trong tháng Y" + hồ sơ nhân sự.

## Phase 3 — Phân quyền nâng cao (P2 · US2)

- [ ] T420 [API] Vai trò tùy chỉnh + quyền theo module (dùng cột `roles.permissions`); guard kiểm tra quyền chi tiết. *(FR-003, SC-002)*
- [ ] T421 [WEB] Màn hình cấu hình vai trò/quyền + gán cho nhân viên.

## Phase 4 — Chấm công & Ca (P2 · US3/US4)

- [ ] T430 [API] `attendance` (công ngày/giờ, đi muộn/về sớm) + `shifts`/phân ca; migration.
- [ ] T431 [WEB] Bảng chấm công tháng + quản lý ca.

## Phase 5 — Lương (P2 · US5)

- [ ] T440 [API] `payroll_config` + bảng lương kỳ (lương cơ bản + phần theo sản lượng từ 003; chưa tự động — tự động ở 005).
- [ ] T441 [WEB] Bảng lương dự kiến theo nhân viên.

## Map US → Tasks

| US | Tasks |
|---|---|
| US1 | T401–T404 |
| US6 | T410–T413 |
| US2 | T420, T421 |
| US3/US4 | T430, T431 |
| US5 | T440, T441 |
