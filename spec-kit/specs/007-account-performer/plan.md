# Implementation Plan: Account-per-Employee & Performer-based Crediting

**Branch**: `007-account-performer` | **Date**: 2026-06-15 | **Spec**: `./spec.md`
**Depends on**: 001, 003, 004, 005. Stack chuẩn.

## Summary

(1) **Mỗi nhân sự có account**: tạo `Employee` ⇒ tự tạo `User` liên kết (vai trò + mật khẩu mặc định); cấp bổ sung cho NV cũ. (2) **Tín công theo người thực hiện**: thêm `production_steps.performedById`, set = người quét QR khi tương tác; chuyển toàn bộ thống kê (worklog/năng suất/KPI) sang `performedById`. Giữ `assignedToId` làm kế hoạch.

## Constitution Check

| Nguyên tắc | Tuân thủ |
|---|---|
| I. RBAC | Account mới có vai trò rõ ràng; chỉ Admin/Hành chính tạo NV+account |
| II. Audit | Cấp account, đổi performer ghi `activity_logs` |
| VI. Security | Mật khẩu mặc định hash Argon2; email duy nhất |
| (Spec-driven) | Đảo quyết định 004 (account tùy chọn) — ghi rõ ở đây + cập nhật 004 |

→ **PASS**.

## Data Model

| Bảng | Thay đổi |
|---|---|
| `production_steps` | + `performedById String?` (FK User) — người thực hiện thực tế. Index. |
| `users` | giữ `employeeId @unique`; nay **mọi Employee có 1 User** (ràng buộc nghiệp vụ, không đổi schema). |
| (User back-relation) | `User.performedSteps ProductionStep[]` (quan hệ mới). |

**Migration**: thêm cột `performedById` + **backfill** `performedById = assignedToId` cho mọi step `status=DONE` (script trong migration hoặc seed-update một lần).

## Thay đổi logic

- **Tạo NV (FR-001/002)** — `employees.create` chạy trong transaction:
  1. tạo `Employee` (NV-####), email **bắt buộc**;
  2. tạo `User` (email, role từ dto, `passwordHash` = hash(mật khẩu mặc định), status ACTIVE);
  3. link `user.employeeId`. Trả về kèm thông tin "đã cấp tài khoản".
  - Endpoint backfill: `POST /employees/provision-accounts` cấp account cho NV chưa có (NV cũ).
- **Scan (FR-003)** — `production` accept/start/complete/report-issue: set `performedById = currentUser.id` (người tương tác). `complete` chốt người hoàn thành = người được tín công. (Vẫn giữ gán `assignedToId` như cũ cho hiển thị kế hoạch.)
- **Thống kê (FR-004)** — đổi khóa nhóm từ `assignedToId` → `performedById`:
  - `employees/{id}/worklog` (004): steps `performedById = user`.
  - `reports/productivity` (003) + `reports/dashboard` workerTop.
  - `automation/kpi` (005).
  - `automation/assignment-suggestion` (005): **giữ** `assignedToId` cho "tải kế hoạch" (FR-005).
- **Web (FR-005)**: form NV thêm **email (bắt buộc) + vai trò**, hiển thị mật khẩu mặc định sau khi tạo; chi tiết đơn — mỗi công đoạn hiển thị "Gán: A · Thực hiện: B" khi khác.

## API Contracts (đổi/﻿thêm)

- `POST /employees` — body thêm `role` (+ email bắt buộc) → tạo NV **kèm account**.
- `POST /employees/provision-accounts` — cấp account cho NV chưa có (Admin).
- Scan endpoints — không đổi contract, chỉ set `performedById`.
- Worklog/productivity/kpi — không đổi contract, đổi nguồn tính.

## Phasing (tasks)

1. Schema: `performedById` + migration + backfill + seed (mọi NV có account; set performer cho step DONE).
2. Account-per-employee: `employees.create` tự tạo User + provision endpoint + web form (email/role).
3. Performer khi scan: set `performedById` ở accept/start/complete/report-issue.
4. Đổi thống kê sang `performedById` (worklog, productivity, dashboard, kpi).
5. Web: hiển thị gán vs thực hiện; selftest + verify.

## Complexity Tracking

- Đảo quyết định 004 ("account tùy chọn" → "mọi NV có account"): cập nhật `004-hr-workforce` (ghi chú supersede). NV không-account không còn ⇒ worklog không còn rỗng vì thiếu account.
- `assignedToId` giữ lại (không bỏ) để phục vụ gợi ý phân công/tải kế hoạch.
- Mật khẩu mặc định cấp hàng loạt là rủi ro bảo mật nhẹ → khuyến nghị buộc đổi lần đầu (P2, ngoài phạm vi).
