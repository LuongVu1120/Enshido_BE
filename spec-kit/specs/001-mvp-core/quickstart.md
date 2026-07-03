# Quickstart — MVP Core (ENSHIDO)

> Mục tiêu: chạy local trong vài phút. Dev mặc định **zero-infra** (SQLite + lưu file disk), không cần Docker.

## Yêu cầu

- Node.js 20+ (đã test trên Node 25), npm 10+.
- (Tùy chọn) Docker — chỉ cần khi muốn chạy PostgreSQL/Redis/MinIO như prod.

## 1. Cài đặt

```bash
# tại repo root
cp api/.env.example api/.env   # tạo env cho API (dev: SQLite)
npm install            # cài tất cả workspace + build @enshido/types
```

## 2. Khởi tạo database (SQLite, dev)

```bash
npm run db:migrate     # tạo schema (prisma migrate)
npm run db:seed        # nạp 6 vai trò + user mẫu + đơn mẫu
```

## 3. Chạy

```bash
npm run dev            # chạy song song API (4000) + Web (3000)
# hoặc tách:
npm run dev:api
npm run dev:web
```

- Web Admin: http://localhost:3000
- API + Swagger: http://localhost:4000/api/docs
- Màn hình thợ (mobile): mở `/scan` rồi quét QR phiếu, hoặc nhập token `qr-SX-YYYYMMDD-0001`.

## 4. Tài khoản demo (mật khẩu chung `123456`)

| Email | Vai trò |
|---|---|
| admin@enshido.vn | Admin / Chủ xưởng |
| quanly@enshido.vn | Quản lý sản xuất |
| tho1@enshido.vn | Thợ sản xuất |
| qc@enshido.vn | Nhân viên QC |
| kho@enshido.vn | Nhân viên kho |
| ketoan@enshido.vn | Kế toán |

## 5. Demo luồng xương sống (E2E)

1. Đăng nhập `quanly@enshido.vn` → **Khách hàng** → thêm khách.
2. **Đơn hàng → Tạo đơn** (chọn khách, thêm sản phẩm, TL ban đầu) → lưu.
3. Mở chi tiết đơn → **Cấu hình công đoạn mặc định** → **In phiếu sản xuất** (có QR).
4. Đăng nhập `tho1@enshido.vn` (điện thoại) → **Quét QR** → Tiếp nhận → Bắt đầu → nhập TL trước/sau → Hoàn thành. Xem hao hụt tự tính.
5. Khi tới công đoạn QC, đăng nhập `qc@enshido.vn` → **QC** → PASS hoặc FAIL (chọn công đoạn trả về).
6. **Kanban** & **Dashboard**: theo dõi realtime.

## 6. Chạy test (logic hao hụt — Hiến pháp III)

```bash
npm run test           # vitest: api/test/loss.spec.ts
```

## 7. Chuyển sang PostgreSQL (prod / đầy đủ)

```bash
docker compose up -d                       # postgres + redis + minio
# api/prisma/schema.prisma: đổi provider = "postgresql"
# api/.env: DATABASE_URL="postgresql://enshido:enshido@localhost:5432/enshido?schema=public"
npm run db:migrate && npm run db:seed
```

## Ghi chú dev accommodations (đã ghi ở plan Complexity Tracking)

- **DB**: dev dùng SQLite cho zero-infra; prod là PostgreSQL (stack chuẩn). Schema để các enum dạng `String` nên portable.
- **File**: dev lưu `./uploads` (đĩa); prod dùng S3/MinIO.
- **Realtime**: Socket.IO single-instance (không cần Redis adapter ở dev).
- **PDF phiếu**: dev in qua trình duyệt (`window.print`); prod có thể render PDF bằng Puppeteer.
