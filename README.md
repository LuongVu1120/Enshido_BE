# ENSHIDO Jewelry — Hệ thống quản lý đơn hàng sản xuất xưởng kim hoàn

Triển khai theo quy trình **[GitHub spec-kit](https://github.com/github/spec-kit)**: `constitution → specify → plan → tasks → implement`.
- **Phase 001 — MVP Core**: Đơn hàng → Sản xuất → Trọng lượng → QC → Kanban/Dashboard. ✅
- **Phase 002 — Inventory (Tồn kho)**: Vật tư/NCC → Nhập/Xuất/Chuyển kho → Nhập kho TP sau QC PASS → Cảnh báo & định giá. ✅
- **Phase 003 — Reports & Analytics**: Báo cáo đơn/sản xuất/QC/hao hụt/năng suất/tồn kho + dashboard nâng cao + xuất CSV. ✅
- **Phase 006 — Order Board & Refinements**: Kanban = **bảng trạng thái đơn** (cột cấu hình được) + sửa đơn/SP, upload ảnh, chi tiết khách, lọc/xuất CSV đơn. ✅
- **Phase 004 (P1) — HR & Workforce**: Hồ sơ nhân viên (bảng `employees` riêng, `NV-####`) + **bảng "công việc theo tháng" của nhân viên** (khớp báo cáo 003). ✅ *(P2 chấm công/ca/lương — chưa)*
- **Phase 005 — Automation & Integrations**: cảnh báo trễ đơn · gợi ý phân công · KPI/lương theo sản lượng · giá vốn (vật tư+công+hao hụt) · cấu hình luật · tích hợp (stub idempotent). ✅
- **Phase 007 — Account & Người thực hiện** (tinh chỉnh): mỗi nhân sự đều có tài khoản (mật khẩu ngẫu nhiên + admin reset); tín công theo **người quét QR thực tế** (`performedById`). ✅
- **Phase 008 — Review fixes**: tự gia hạn phiên (refresh), QC đính kèm ảnh lỗi, màn **"Việc của tôi"** cho thợ, tự đổi mật khẩu, siết RBAC đọc đơn, nhập trọng lượng trên desktop, phân trang tồn kho/nhân sự. ✅
- **Phase 009 — QC Inspection**: phiếu kiểm QC theo **bộ tiêu chí** + thông tin SP/hao hụt + 3 kết quả (Đạt/Cần sửa/Không đạt) + ảnh lỗi + lịch sử + thống kê; sửa bug `Card` không bấm được. ✅
- **Phase 010 — Tên đơn · Ghi chú rich · Sửa NV**: tên đơn sửa được (mặc định = mã đơn); **ghi chú đơn rich content (TipTap)** hiển thị có định dạng + sanitize server-side; sửa hồ sơ nhân viên từ UI (đồng bộ tên tài khoản). ✅
- **Phase 011 — Lô sản xuất (Đúc/Xi mạ theo mẻ)**: gom nhiều đơn cùng công đoạn, **cân tổng cả lô → tự phân bổ hao hụt về từng đơn theo tỉ lệ khối lượng** (+ sửa tay), giữ toàn vẹn hao hụt per-đơn; gom bằng QR/danh sách; công đoạn batch cấu hình được. + **Kanban theo công đoạn** (kéo = hoàn thành). ✅
- **Phase 012 — Tinh chỉnh Trọng lượng & QC**: công đoạn hiển thị **tiếng Việt**; nhập cân **chọn công đoạn + người cân**, trùng công đoạn = chỉnh sửa (gộp 1 dòng, vẫn lưu log); QC "Cần sửa/Không đạt" rút gọn còn **tên lỗi + mô tả rich text + ảnh** (server tự chọn công đoạn trả về), giữ bộ 8 tiêu chí. ✅
- **Phase 013 — QR full-link · Gom lô khi quét · KL tiếp nhận**: QR phiếu dùng **IP LAN** (dev) + hiển thị URL đích → quét được từ điện thoại/app ngoài; màn quét thợ có chế độ **Gom lô** (quét liên tục nhiều QR → 1 lô Đúc/Xi mạ); quét xong nhập **KL tiếp nhận** (tùy chọn). ✅

> Tài liệu spec-kit nằm ở [`spec-kit/`](./spec-kit). Mã nguồn triển khai nằm ở root (`api/`, `apps/web/`, `packages/`). Báo cáo tính năng kèm ảnh: [`docs/REPORT.md`](./docs/REPORT.md) / `docs/REPORT.html`.
>
> 📘 **Hướng dẫn**: [Triển khai & chuyển SQLite→PostgreSQL](./docs/DEPLOYMENT.md) · [Hướng dẫn sử dụng (đăng nhập, đơn hàng, Kanban, QC…)](./docs/USER_GUIDE.md)

## Trạng thái

🎉 **Toàn bộ roadmap (001→006→004 P1→005→007→008→009→010→011→012→013) đã triển khai & chạy end-to-end.** Self-test tự động: **212/212 PASS** (`npm run selftest`); unit test hao hụt **6/6 pass** (`npm test`).
Luồng khép kín đã verify: login → tạo đơn → in phiếu QR → thợ quét cập nhật công đoạn + trọng lượng → QC PASS/FAIL → **nhập kho thành phẩm → đơn STOCKED** → Bảng đơn/Báo cáo/Nhân sự/Tự động hóa realtime. *(Còn 004 P2: chấm công/ca/lương đầy đủ.)*

## Chạy nhanh (zero-infra, không cần Docker)

```bash
npm install            # cài tất cả workspace + build @enshido/types
npm run db:migrate     # tạo SQLite schema
npm run db:seed        # nạp 6 vai trò + user + đơn mẫu
npm run dev            # API :4000  +  Web :3000
```

- Web Admin: http://localhost:3000 · API docs (Swagger): http://localhost:4000/api/docs
- Tài khoản demo (mật khẩu `123456`): `admin@enshido.vn`, `quanly@enshido.vn`, `tho1@enshido.vn`, `qc@enshido.vn`, `kho@enshido.vn`, `ketoan@enshido.vn`.

Chi tiết & demo E2E: [`spec-kit/specs/001-mvp-core/quickstart.md`](./spec-kit/specs/001-mvp-core/quickstart.md).

## Kiến trúc (monorepo TypeScript)

```
enshido/
├── api/                 # NestJS REST API (Prisma + SQLite/Postgres)
│   ├── src/
│   │   ├── auth/        # JWT access+refresh, Argon2, RBAC guards
│   │   ├── common/      # audit (append-only), sinh mã, storage, Socket.IO gateway
│   │   ├── customers/ orders/ production/ weight/ qc/ dashboard/ users/ attachments/
│   │   └── prisma/
│   ├── prisma/          # schema.prisma (12 bảng) + seed.ts
│   └── test/            # vitest: loss.spec.ts (hao hụt — Hiến pháp III)
├── apps/web/            # Next.js (App Router) — Admin + màn hình thợ /scan (mobile)
│   ├── app/             # login, dashboard, orders, kanban, qc, customers, scan/[token]
│   ├── components/      # UI primitives, shell, status badges, QR scanner, ticket
│   └── lib/             # api client, auth/query providers, realtime, format
├── packages/types/      # enum & công thức dùng chung FE/BE (single source of truth)
└── docker-compose.yml   # Postgres + Redis + MinIO (prod/đầy đủ)
```

## Bản đồ tuân thủ Hiến pháp (`spec-kit/.specify/memory/constitution.md`)

| Nguyên tắc | Triển khai |
|---|---|
| I. RBAC server-side | `JwtAuthGuard` + `RolesGuard` global, `@Roles()` mỗi endpoint; menu FE lọc theo vai trò |
| II. Audit immutable | `AuditService` ghi `activity_logs` **append-only** (chỉ create) cho mọi mutation nhạy cảm |
| III. Toàn vẹn hao hụt | `calcLoss()` công thức chuẩn (test 6/6); `weight_logs` bất biến; cảnh báo vượt định mức |
| IV. Mobile-first thợ | `/scan/[token]` nút lớn, một tay; preview hao hụt realtime |
| V. Spec-driven incremental | Build P1 trước (chạy được) rồi P2; tasks.md theo user story |
| VI. Security by default | JWT, Argon2, QR token (không nhúng dữ liệu nhạy cảm + vô hiệu khi hủy đơn), kiểm soát upload |
| VII. Performance & realtime | Phân trang + index; Socket.IO phát sự kiện cập nhật Kanban/Dashboard |

## Quy ước mã

`SX-YYYYMMDD-####` (đơn) · `PSX-YYYYMMDD-####` (phiếu) · `KH-######` (khách) · `VT-######` (vật tư).

## API chính (xem Swagger `/api/docs`)

`POST /api/login` · `GET /api/me` · `GET/POST /api/customers` · `GET/POST /api/orders` ·
`POST /api/orders/{id}/configure-steps` · `POST /api/orders/{id}/print-production-ticket` ·
`GET /api/scan/{token}` · `POST /api/scan/{token}/accept|start|complete|report-issue` ·
`GET/POST /api/orders/{id}/weight-logs` · `GET /api/qc/orders` · `POST /api/qc/{id}/pass|fail` ·
`GET /api/production/board` (+ `/board/columns` CRUD) · `GET /api/orders/export` · `GET /api/dashboard/summary`.

**Tồn kho (002):** `GET/POST /api/inventory/items` · `GET/POST /api/inventory/suppliers` ·
`POST /api/inventory/receipts|issues|transfers` · `GET /api/inventory/transactions` ·
`GET /api/inventory/finished-goods/pending` · `POST /api/inventory/finished-goods/stock-in` ·
`GET /api/inventory/alerts|valuation|summary`.

**Báo cáo (003):** `GET /api/reports/orders|production|qc|loss|productivity|inventory` ·
`GET /api/reports/dashboard` · `GET /api/reports/{kind}/export` (CSV).

**Nhân sự (004):** `GET/POST /api/employees` · `GET /api/employees/{id}/worklog?month=`.

**Tự động hóa (005):** `GET /api/automation/delay-risk|assignment-suggestion|kpi|settings` ·
`GET /api/automation/costing/{orderId}` · `GET/PUT /api/automation/settings` ·
`POST /api/automation/integrations/{id}/sync`.

## Còn lại (mở rộng)

- **004 P2**: phân quyền nâng cao theo module, chấm công/ca, khung lương đầy đủ.
- Hạ tầng prod: PostgreSQL + Redis + S3/MinIO (xem `docker-compose.yml`).

Xem [`spec-kit/ROADMAP.md`](./spec-kit/ROADMAP.md). Với mỗi phase: chạy `plan → tasks → implement → verify`.

## Lưu ý dev vs prod

Dev mặc định dùng **SQLite + lưu file disk** để chạy ngay không cần hạ tầng. Lên prod đổi sang
**PostgreSQL + Redis + S3/MinIO** (xem `docker-compose.yml` + quickstart mục 7). Các điều chỉnh này
được ghi nhận ở `plan.md` mục *Complexity Tracking* — không thay đổi nguyên tắc hiến pháp.
