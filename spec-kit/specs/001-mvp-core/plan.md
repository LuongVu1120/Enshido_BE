# Implementation Plan: MVP Core — ENSHIDO

**Branch**: `001-mvp-core` | **Date**: 2026-06-09 | **Spec**: `./spec.md`

**Input**: Feature specification from `specs/001-mvp-core/spec.md`

> Plan này được soạn sẵn để `/speckit.plan` tinh chỉnh. Stack áp dụng cho **toàn hệ thống** (các phase 002–005 kế thừa).

## Summary

Xây luồng xương sống: tạo đơn → in phiếu QR → thợ quét cập nhật công đoạn → nhập trọng lượng & tính hao hụt → QC pass/fail/trả lỗi → Kanban + dashboard cơ bản, trên nền **monorepo TypeScript** (Next.js web + PWA, NestJS REST API, PostgreSQL, Redis, S3/MinIO), realtime qua WebSocket, RBAC + audit log immutable.

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js LTS 20+

**Primary Dependencies**:
- Frontend: Next.js (App Router) + React, TailwindCSS + shadcn/ui, TanStack Query, TanStack Table, dnd-kit (Kanban), Recharts (dashboard), react-hook-form + Zod, Serwist (PWA), @zxing/browser (quét QR).
- Backend: NestJS, Prisma ORM, Passport + JWT (access/refresh), Argon2, Socket.IO (realtime), BullMQ (job), qrcode (sinh QR), Puppeteer (PDF phiếu/báo cáo), ExcelJS (xuất Excel — dùng từ phase 003).

**Storage**: PostgreSQL (dữ liệu chính) · Redis (cache/queue/websocket adapter) · S3-compatible/MinIO (ảnh, file thiết kế).

**Testing**: Vitest/Jest (unit) cho logic hao hụt & định tuyến QC; Supertest (API/contract); Playwright (e2e luồng thợ + tạo đơn).

**Target Platform**: Web app nội bộ (desktop/tablet) + PWA mobile cho thợ; deploy Docker (self-host hoặc cloud).

**Project Type**: Web application (frontend + backend) — monorepo.

**Performance Goals**: thao tác thợ ≤ 5s (SC-001); quét QR mở đơn ≤ 3s (SC-004); danh sách ~300 đơn ≤ 1s (SC-007); Kanban/dashboard cập nhật realtime.

**Constraints**: RBAC server-side; audit immutable; lịch sử cân bất biến; QR token không chứa dữ liệu nhạy cảm; tiếng Việt là ngôn ngữ chính; backup PostgreSQL định kỳ.

**Scale/Scope**: ~vài trăm đơn đang chạy đồng thời (mockup 286 đơn), ~50 nhân sự; MVP gồm 11 user story (8×P1, 3×P2) và ~23 màn hình desktop + 11 màn hình mobile (xem tài liệu mục 4).

## Constitution Check

*GATE: phải đạt trước khi thiết kế chi tiết.*

| Nguyên tắc | Cách MVP tuân thủ |
|---|---|
| I. RBAC least-privilege | Guard theo vai trò ở NestJS; menu FE theo quyền |
| II. Audit immutable | Bảng `activity_logs` append-only; interceptor ghi log mọi mutation nhạy cảm |
| III. Weight/Loss integrity | Tính hao hụt ở server theo công thức chuẩn + unit test; `weight_logs` không cho update |
| IV. Mobile-first thợ | PWA, màn hình thao tác nhanh; mục tiêu ≤ 5s |
| V. Spec-driven incremental | Build P1 trước (MVP chạy được), rồi P2/P3 |
| VI. Security by default | JWT + Argon2; QR token; upload kiểm soát loại/dung lượng |
| VII. Performance & realtime | Index + phân trang; WebSocket cho Kanban/Dashboard |

→ **PASS**, không có vi phạm cần biện minh.

## Project Structure

### Documentation (this feature)

```text
specs/001-mvp-core/
├── spec.md          # đã có
├── plan.md          # file này
├── research.md      # /speckit.plan sinh (chốt version, lựa chọn Prisma vs TypeORM, MinIO vs S3...)
├── data-model.md    # /speckit.plan sinh (chi tiết hóa phần Data Model bên dưới)
├── quickstart.md    # /speckit.plan sinh (chạy local: docker compose up, seed, migrate)
├── contracts/       # /speckit.plan sinh (OpenAPI cho các endpoint mục API bên dưới)
└── tasks.md         # /speckit.tasks sinh
```

### Source Code (repository root)

```text
enshido/                      # monorepo (Turborepo)
├── apps/
│   ├── web/                  # Next.js — Admin (desktop/tablet)
│   │   ├── app/              # routes: dashboard, orders, kanban, qc, customers...
│   │   ├── components/       # shadcn/ui + domain components
│   │   └── lib/              # api client (TanStack Query), auth, i18n(vi)
│   └── worker-pwa/           # PWA cho thợ (hoặc route /m trong web) — quét QR, cập nhật nhanh
├── api/                      # NestJS
│   ├── src/
│   │   ├── auth/             # login, JWT, RBAC guards
│   │   ├── customers/
│   │   ├── orders/           # orders + order_items
│   │   ├── production/       # production_steps, kanban, scan
│   │   ├── qc/
│   │   ├── weight/           # weight_logs + tính hao hụt
│   │   ├── tickets/          # phiếu sản xuất + QR + PDF
│   │   ├── dashboard/
│   │   ├── audit/            # activity_logs (append-only)
│   │   ├── attachments/      # S3/MinIO presigned upload
│   │   └── common/           # guards, interceptors (audit), pipes (Zod/class-validator)
│   ├── prisma/               # schema.prisma + migrations + seed
│   └── test/                 # contract/integration/e2e
└── packages/
    ├── types/                # type & enum dùng chung FE/BE (trạng thái đơn, công đoạn, loại lỗi)
    └── config/               # eslint, tsconfig, tailwind preset
```

**Structure Decision**: Web application monorepo (Option 2). FE và BE chung TypeScript + `packages/types` để đồng bộ enum trạng thái/công đoạn/loại lỗi giữa hai phía.

## Data Model (12 bảng — theo tài liệu mục 5)

> Chi tiết hóa thành `data-model.md`. Quan hệ chính: `customers 1—* orders 1—* order_items 1—* production_steps`; `orders/order_items 1—* qc_records, weight_logs, attachments`.

| Bảng | Vai trò | Trường chính |
|---|---|---|
| `users` | Tài khoản | name, phone, email, password(hash), role_id, status |
| `roles` | Vai trò/quyền | name, permissions(JSON) |
| `customers` | Khách hàng | customer_code, name, phone, address, channel, customer_type |
| `orders` | Đơn hàng | order_code, customer_id, sales_channel, order_type, status, priority, deadline, created_by, qr_token |
| `order_items` | SP trong đơn | order_id, product_code, product_name, category, quantity, material, stone_type, stone_size, size, plating_color, image_url, technical_note |
| `production_steps` | Công đoạn | order_id, order_item_id, step_name, step_order, assigned_to, status, started_at, completed_at, input/completed/defect_quantity, input/output_weight, loss_weight, loss_percent |
| `qc_records` | QC | order_id, order_item_id, qc_user_id, result, defect_type, severity, return_step_id, assigned_rework_user_id, rework_deadline, image_urls |
| `weight_logs` | Cân & hao hụt | order_id, order_item_id, production_step_id, stage_name, previous/current_weight, loss_weight, loss_percent, cumulative_loss_weight/percent, allowed_loss_percent, measured_by, measured_at |
| `inventory_items` | Vật tư *(dùng đầy đủ ở 002)* | item_code, name, category, unit, current/min_stock, cost_price, supplier_id, status |
| `inventory_transactions` | Nhập/xuất *(002)* | transaction_code/type, inventory_item_id, order_id, quantity, unit_price |
| `activity_logs` | Nhật ký (append-only) | user_id, order_id, action, object_type, object_id, old_value, new_value |
| `attachments` | File/ảnh | object_type, object_id, file_url, file_type, uploaded_by |

> Ở MVP, `inventory_*` chỉ cần đủ để xuất vật tư đơn giản / placeholder; nghiệp vụ kho đầy đủ thuộc phase **002**.

## API Contracts (MVP — theo tài liệu mục 6)

- **Auth**: `POST /login`, `POST /logout`, `GET /me`
- **Customers**: `GET/POST /customers`, `GET/PUT /customers/{id}`, `GET /customers/{id}/orders`
- **Orders**: `GET/POST /orders`, `GET/PUT/DELETE /orders/{id}`, `POST /orders/{id}/print-production-ticket`, `GET /orders/{id}/timeline`
- **QR/Scan**: `GET /scan/{qr_token}`, `POST /scan/{qr_token}/accept|start|complete|report-issue`
- **Production**: `GET /production/kanban`, `POST /production/steps/{id}/assign|start|complete|return`, `PUT /production/steps/{id}`
- **QC**: `GET /qc/orders`, `POST /qc/{order_id}/pass|fail|return-step`
- **Weight**: `GET/POST /orders/{id}/weight-logs`
- **Dashboard**: `GET /dashboard/summary`

## Phasing trong MVP (gợi ý cho /speckit.tasks)

1. Nền tảng: monorepo + Prisma schema + auth/RBAC + audit interceptor + attachments. *(US1, FR-001/002/016/017)*
2. Khách hàng + Đơn hàng + Công đoạn. *(US2/US3/US4)*
3. Phiếu QR + màn hình thợ + trọng lượng/hao hụt. *(US5/US6/US7)* — lõi giá trị.
4. QC + trả lỗi. *(US8)*
5. Kanban + Dashboard cơ bản. *(US9/US10)* — P2.

## Complexity Tracking

Không có vi phạm **nguyên tắc** hiến pháp. Có **điều chỉnh hạ tầng chỉ ở môi trường dev** (constraint "Stack chuẩn" cho phép lệch nếu ghi nhận ở plan):

| Hạng mục | Stack chuẩn (prod) | Dev (đã triển khai) | Lý do | Ảnh hưởng nguyên tắc |
|---|---|---|---|---|
| CSDL | PostgreSQL | **SQLite** (zero-infra) | Máy dev không có Docker/Postgres; chạy ngay sau `npm install` | Không — schema portable (enum lưu `String`), đổi 1 dòng provider sang Postgres. Validate enum ở code. |
| Lưu file | S3/MinIO | **Disk** `./uploads` | Không cần MinIO khi dev | Không — vẫn kiểm soát loại & dung lượng (VI). Interface đổi driver = s3 ở prod. |
| Realtime | Socket.IO + Redis adapter | **Socket.IO single-instance** | 1 instance dev | Không — VII vẫn đạt; prod thêm `@socket.io/redis-adapter`. |
| PDF phiếu | Puppeteer (HTML→PDF) | **`window.print()`** | Tránh tải Chromium nặng ở dev | Không — phiếu + QR vẫn đầy đủ (US5). |
| BullMQ/Redis queue | Có | **Tính đồng bộ** | Báo cáo nặng thuộc phase 003 | Không cho MVP. |

→ Tất cả là lựa chọn vận hành dev, **không thay đổi nguyên tắc I–VII**. Lên prod chỉ cần đổi env + provider (xem `quickstart.md` mục 7).
