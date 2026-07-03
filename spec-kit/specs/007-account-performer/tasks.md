# Tasks: Account-per-Employee & Performer-based Crediting

**Branch**: `007-account-performer` | **Spec**: `./spec.md` | **Plan**: `./plan.md`
**Depends on**: 001, 003, 004, 005.

## Phase 0 — Schema & dữ liệu

- [x] T701 Prisma: `production_steps.performedById` (FK User) + `User.performedSteps`; migration.
- [x] T702 Backfill: `performedById = assignedToId` cho mọi step `status=DONE`; seed cập nhật (mọi NV có account + set performer cho step DONE đã seed).

## Phase 1 — Mỗi nhân sự có account (P1 · US1)

- [x] T710 [API] `employees.create` (transaction): tạo Employee + **User** (email duy nhất bắt buộc, role từ dto, mật khẩu mặc định hash Argon2) + link. *(FR-001)*
- [x] T711 [API] `POST /employees/provision-accounts`: cấp account cho NV chưa có (Admin). *(FR-002)*
- [x] T712 [API] `POST /employees/{id}/reset-password` (Admin): sinh mật khẩu **ngẫu nhiên** mới, trả về 1 lần.
- [x] T713 [WEB] Form NV: **email (bắt buộc) + vai trò**; sau khi tạo hiện **mật khẩu ngẫu nhiên 1 lần**; nút **Reset mật khẩu** (Admin); danh sách không còn "Không có tài khoản".
- [x] T714 [TEST] Tạo NV → có account + mật khẩu ngẫu nhiên đăng nhập được; email trùng → lỗi; reset mật khẩu → mật khẩu cũ hết hiệu lực, mật khẩu mới đăng nhập được; nghỉ việc → khóa. *(SC-001)*

## Phase 2 — Người thực hiện thực tế (P1 · US2)

- [x] T720 [API] Scan accept/start/complete/report-issue: set `production_steps.performedById = currentUser`; audit. *(FR-003)*
- [x] T721 [API] Chuyển thống kê sang `performedById`: worklog (004), reports/productivity + dashboard workerTop (003), automation/kpi (005). Giữ assignment-suggestion theo `assignedToId`. *(FR-004/005)*
- [x] T722 [WEB] Chi tiết đơn: mỗi công đoạn hiển thị "Gán: A · Thực hiện: B" khi khác. *(FR-005)*
- [x] T723 [TEST] Thợ B (khác người gán) hoàn thành → công tính cho B ở worklog/năng suất/KPI; worklog↔năng suất↔KPI khớp. *(SC-002/003)*

## Phase 3 — Cập nhật tài liệu

- [x] T730 Cập nhật `004-hr-workforce` (ghi chú supersede: mọi NV có account); ROADMAP/README/REPORT.

## Map US → Tasks

| US | Tasks |
|---|---|
| US1 | T710–T713 |
| US2 | T720–T723 |
| (data) | T701, T702 |
