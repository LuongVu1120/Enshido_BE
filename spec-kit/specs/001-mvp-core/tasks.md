# Tasks: MVP Core — ENSHIDO

**Branch**: `001-mvp-core` | **Spec**: `./spec.md` | **Plan**: `./plan.md`

> Sinh theo quy ước spec-kit. Mỗi task có ID, ưu tiên (P1/P2/P3 theo user story), marker `[P]` = có thể chạy **song song** (file/độc lập khác nhau), và tham chiếu tới FR/US.
> Thứ tự thực thi bám theo **Phasing trong MVP** của `plan.md`: Nền tảng → Khách hàng/Đơn/Công đoạn → Phiếu QR/Thợ/Trọng lượng → QC → Kanban/Dashboard.

## Legend

- `[P]` — task độc lập, có thể giao song song.
- `[x]` — đã hoàn thành (cập nhật khi implement).
- Mỗi nhóm kết thúc bằng một **Checkpoint** để demo/test độc lập.

---

## Phase 0 — Nền tảng dự án (Setup)

- [x] T001 Khởi tạo monorepo Turborepo + npm workspaces (`apps/web`, `api`, `packages/types`, `packages/config`).
- [x] T002 [P] `packages/types`: enum dùng chung (OrderStatus, StepName, StepStatus, QCResult, DefectSeverity, Role, SalesChannel, OrderType) + DTO type chia sẻ FE/BE.
- [x] T003 [P] `docker-compose.yml`: PostgreSQL 16, Redis 7, MinIO; `.env.example`.
- [x] T004 [P] Cấu hình lint/format/tsconfig base trong `packages/config`.
- [x] T005 Prisma: `schema.prisma` 12 bảng (data-model), datasource portable (Postgres prod / SQLite dev), migration đầu tiên.
- [x] T006 Prisma seed: 6 roles + 6 user mẫu (mỗi vai trò 1), 1 quy trình công đoạn mặc định, vài khách + đơn mẫu.

**Checkpoint 0**: `npm install` chạy được; `prisma migrate` + `seed` thành công; API & web build.

---

## Phase 1 — US1 Đăng nhập & RBAC (P1) · US11 Audit (P2 nền tảng)

- [x] T010 [API] Module `auth`: `POST /login`, `POST /logout`, `GET /me`; JWT access+refresh; hash Argon2. *(FR-001, US1)*
- [x] T011 [API] `common`: `JwtAuthGuard` + `RolesGuard` + decorator `@Roles()`; mọi endpoint khai báo vai trò. *(FR-001)*
- [x] T012 [API] `common`: `AuditInterceptor` ghi `activity_logs` append-only cho mọi mutation nhạy cảm (đổi trạng thái, trọng lượng, QC). *(FR-016, US11)*
- [x] T013 [API] Khóa/mở tài khoản (`status`), không xóa cứng; guard chặn user bị khóa. *(FR-002)*
- [x] T014 [WEB] Trang `/login`, lưu token, middleware redirect khi chưa đăng nhập; menu hiển thị theo vai trò. *(US1)*
- [x] T015 [TEST] [P] Unit/e2e: 6 vai trò thấy đúng menu/endpoint; tài khoản khóa không vào được.

**Checkpoint 1**: Đăng nhập 6 vai trò, RBAC chặn đúng, audit log ghi nhận.

---

## Phase 2 — US2 Khách hàng (P1) · US3 Đơn hàng (P1) · US4 Công đoạn (P1)

- [x] T020 [API] [P] Module `customers`: CRUD + sinh mã `KH-######`; `GET /customers/{id}/orders`. *(FR-003, US2)*
- [x] T021 [API] Module `orders`: tạo đơn + `order_items`; sinh mã `SX-YYYYMMDD-####`; lọc/tìm/phân trang. *(FR-004, US3)*
- [x] T022 [API] Vòng đời trạng thái đơn (state machine) + sửa/hủy khi chưa sản xuất; ghi audit. *(FR-005, US3)*
- [x] T023 [API] Module `production`: chọn tập công đoạn áp dụng cho đơn, gán thứ tự + người phụ trách → sinh `production_steps`. *(FR-006, US4)*
- [x] T024 [WEB] [P] Danh sách + chi tiết khách hàng. *(US2)*
- [x] T025 [WEB] Danh sách đơn (lọc/tìm/phân trang) + form tạo đơn nhiều sản phẩm + chi tiết đơn (timeline). *(US3)*
- [x] T026 [WEB] Cấu hình công đoạn trong chi tiết đơn. *(US4)*
- [x] T027 [TEST] [P] Sinh mã đúng định dạng; lọc/phân trang đúng; bỏ công đoạn → chuỗi step đúng thứ tự.

**Checkpoint 2**: Tạo khách → tạo đơn 2 SP → cấu hình công đoạn → đơn ở "Chờ sản xuất".

---

## Phase 3 — US5 Phiếu QR (P1) · US6 Thợ quét (P1) · US7 Trọng lượng/Hao hụt (P1)

- [x] T030 [API] Module `tickets`: sinh `qr_token`, mã `PSX-YYYYMMDD-####`; `POST /orders/{id}/print-production-ticket` (HTML→PDF). *(FR-007, US5)*
- [x] T031 [API] Vô hiệu hóa QR khi hủy đơn; `GET /scan/{qr_token}` yêu cầu đăng nhập, mở đúng đơn + công đoạn hiện tại; ghi ai quét. *(FR-008, US5/US6)*
- [x] T032 [API] `POST /scan/{token}/accept|start|complete|report-issue`; chống ghi đè đồng thời (optimistic lock). *(FR-009, US6)*
- [x] T033 [API] Module `weight`: `GET/POST /orders/{id}/weight-logs`; tính hao hụt g/%/lũy kế (công thức chuẩn); `weight_logs` bất biến. *(FR-010, US7)*
- [x] T034 [API] Cảnh báo vượt định mức hao hụt (công đoạn + người + chênh lệch). *(FR-011, US7)*
- [x] T035 [TEST] **Unit hao hụt** (bắt buộc theo hiến pháp III): trước 12.50/sau 12.20 → 0.30g & 2.40%; lũy kế; vượt định mức cảnh báo. *(SC-003)*
- [x] T036 [WEB] PWA màn hình thợ (mobile-first): quét QR (@zxing) → tiếp nhận → bắt đầu → nhập SL+trọng lượng → hoàn thành → báo lỗi + ảnh; mục tiêu ≤ 5s. *(US6, SC-001)*
- [x] T037 [WEB] [P] In phiếu sản xuất (layout bám mockup) + QR.
- [x] T038 [API] Module `attachments`: presigned upload S3/MinIO (dev: disk), kiểm soát loại/dung lượng. *(FR-017)*

**Checkpoint 3**: In phiếu → quét QR → cập nhật chuỗi công đoạn + nhập trọng lượng → hao hụt & lũy kế đúng + cảnh báo.

---

## Phase 4 — US8 QC PASS/FAIL/Trả lỗi (P1)

- [x] T040 [API] Module `qc`: `GET /qc/orders`; `POST /qc/{order_id}/pass|fail|return-step`. *(FR-012, US8)*
- [x] T041 [API] FAIL/CẦN SỬA → đưa đơn về đúng công đoạn "Cần sửa", tạo việc sửa, lưu lịch sử QC nhiều lần, đếm số lần làm lại. *(FR-013, US8)*
- [x] T042 [WEB] Màn hình QC: chọn kết quả, loại lỗi, mức độ, công đoạn trả về, người xử lý, deadline, ảnh lỗi; lịch sử QC. *(US8)*
- [x] T043 [TEST] [P] QC FAIL về đúng công đoạn 100% case; PASS → "Hoàn thành sản xuất". *(SC-006)*

**Checkpoint 4**: Đưa đơn tới QC → FAIL trả công đoạn → sửa → QC lại PASS; lịch sử đầy đủ.

---

## Phase 5 — US9 Kanban (P2) · US10 Dashboard (P2) · Realtime

- [x] T050 [API] `GET /production/kanban` (theo cột công đoạn, lọc, cảnh báo trễ/hao hụt); `PUT /production/steps/{id}` kéo-thả. *(FR-014, US9)*
- [x] T051 [API] WebSocket gateway (Socket.IO): phát sự kiện khi step/đơn đổi → cập nhật Kanban/Dashboard realtime. *(VII)*
- [x] T052 [API] `GET /dashboard/summary`: tổng đơn, đang SX, trễ hạn, hoàn thành hôm nay, QC fail, tỷ lệ QC pass, công đoạn tắc. *(FR-015, US10)*
- [x] T053 [WEB] Kanban kéo–thả (dnd-kit) + bộ lọc + cảnh báo trên thẻ. *(US9)*
- [x] T054 [WEB] Dashboard (Recharts): thẻ chỉ số + biểu đồ tiến độ/QC + danh sách công đoạn tắc. *(US10)*
- [x] T055 [TEST] [P] Dashboard số liệu khớp dữ liệu; Kanban kéo-thả cập nhật trạng thái + audit.

**Checkpoint 5 (MVP done)**: Toàn luồng chạy realtime; demo end-to-end theo SC-001…SC-007.

---

## Phụ thuộc & song song

- T001 → (T002,T003,T004) → T005 → T006: nền tảng tuần tự, các `[P]` trong cùng bậc chạy song song.
- Phase 1 chặn mọi phase sau (auth/RBAC/audit là nền).
- Phase 2 chặn 3,4,5 (cần đơn + công đoạn).
- Trong mỗi phase, API trước, WEB sau (WEB phụ thuộc contract API); task `[P]` khác file chạy song song.

## Map US → Tasks

| US | Tasks |
|---|---|
| US1 | T010–T015 |
| US2 | T020, T024 |
| US3 | T021, T022, T025 |
| US4 | T023, T026 |
| US5 | T030, T031, T037 |
| US6 | T032, T036 |
| US7 | T033, T034, T035 |
| US8 | T040–T043 |
| US9 | T050, T053 |
| US10 | T052, T054 |
| US11 | T012 |
