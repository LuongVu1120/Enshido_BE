# Hướng dẫn Triển khai (Deployment) & Chuyển SQLite → PostgreSQL

Tài liệu này hướng dẫn chạy ENSHIDO ở **dev** (zero-infra) và **production** (VM/server), kèm quy trình **đổi cơ sở dữ liệu từ SQLite sang PostgreSQL**.

> Ngôn ngữ hệ thống: Tiếng Việt. Toàn bộ lệnh chạy ở **thư mục gốc repo** trừ khi ghi rõ `cd api`.

---

## 1. Kiến trúc & cổng

| Thành phần | Công nghệ | Cổng mặc định | Ghi chú |
|---|---|---|---|
| **API** | NestJS + Prisma | `4000` | Prefix `/api`, Swagger `/api/docs` |
| **Web** | Next.js (App Router) | `3000` | Admin + màn hình thợ `/scan` |
| **DB (dev)** | SQLite (`api/prisma/dev.db`) | — | Zero-infra |
| **DB (prod)** | PostgreSQL | `5432` | Xem §5 |
| **File/ảnh** | Disk `api/uploads/` (dev) | — | Prod: volume bền hoặc S3/MinIO |

- Web gọi API qua biến **`NEXT_PUBLIC_API_URL`** (mặc định `http://localhost:4000`).
- API cho phép CORS theo **`WEB_ORIGIN`** (nhiều origin phân tách bằng dấu phẩy).
- Ảnh upload phục vụ tĩnh ở `/<API>/uploads/...` (đọc từ thư mục làm việc của tiến trình API).

**Yêu cầu:** Node.js **20+**, npm 10+. (Tùy chọn: Docker để dựng Postgres/Redis/MinIO.)

---

## 2. Chạy nhanh môi trường DEV (SQLite, không cần Docker)

```bash
npm install                 # cài toàn bộ workspace + build @enshido/types
cp api/.env.example api/.env   # tạo cấu hình (lần đầu)
npm run db:migrate          # tạo schema SQLite
npm run db:seed             # nạp 6 vai trò + dữ liệu mẫu
npm run dev                 # API :4000 + Web :3000 (song song)
```

- Web: http://localhost:3000 · Swagger: http://localhost:4000/api/docs
- Tài khoản demo (mật khẩu `123456`): `admin@enshido.vn`, `quanly@enshido.vn`, `tho1@enshido.vn`, `qc@enshido.vn`, `kho@enshido.vn`, `ketoan@enshido.vn`.
- Kiểm thử: `npm run selftest` (E2E, cần API+Web đang chạy) · `npm test` (unit hao hụt).

---

## 3. Biến môi trường

### API — `api/.env`
| Biến | Ví dụ | Mô tả |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite (dev). Prod: chuỗi Postgres (§5) |
| `JWT_ACCESS_SECRET` | *(chuỗi ngẫu nhiên mạnh)* | **BẮT BUỘC đổi ở prod** |
| `JWT_REFRESH_SECRET` | *(chuỗi ngẫu nhiên mạnh)* | **BẮT BUỘC đổi ở prod** |
| `JWT_ACCESS_TTL` | `900s` | Hạn access token |
| `JWT_REFRESH_TTL` | `7d` | Hạn refresh token |
| `API_PORT` | `4000` | Cổng API |
| `WEB_ORIGIN` | `https://app.congty.vn` | Origin web cho CORS (phân tách `,`) |
| `PUBLIC_WEB_ORIGIN` | `https://app.congty.vn` | URL nhúng vào **QR phiếu** (nếu trống, dev tự dò IP LAN) |
| `STORAGE_DRIVER` | `disk` | `disk` (mặc định). Prod: gắn volume bền cho `uploads/` |
| `DEFAULT_ALLOWED_LOSS_PERCENT` | `3.0` | Định mức hao hụt cảnh báo (%) |

### Web — `apps/web/.env.local` (tạo mới khi prod)
```bash
NEXT_PUBLIC_API_URL="https://api.congty.vn"   # KHÔNG kèm /api ở cuối
```
> ⚠️ Next.js **nhúng `NEXT_PUBLIC_*` lúc build**. Phải đặt biến **trước** khi chạy `npm run build`. Đổi URL API ⇒ build lại web.

---

## 4. Triển khai PRODUCTION (trên 1 VM/server)

### 4.1 Build
```bash
npm install
# Đặt NEXT_PUBLIC_API_URL trước khi build web (xem §3)
npm run build            # build @enshido/types → api → web
```
Kết quả: `api/dist/main.js` và `apps/web/.next/`.

### 4.2 Chuẩn bị DB
- **Dev/demo**: `npm run db:migrate && npm run db:seed`.
- **Prod với migration có sẵn**: `cd api && npx prisma migrate deploy` (áp dụng migrations, không sinh mới).
- Đổi sang PostgreSQL: xem **§5**.

### 4.3 Khởi động 2 tiến trình
```bash
# API
node api/dist/main.js                 # hoặc: npm run start -w api

# Web (tiến trình khác)
npm run start -w @enshido/web         # next start -p 3000
```

### 4.4 Chạy nền bằng PM2 (khuyến nghị)
```bash
npm i -g pm2
pm2 start api/dist/main.js --name enshido-api --cwd ./api
pm2 start "npm run start -w @enshido/web" --name enshido-web
pm2 save && pm2 startup       # tự chạy lại sau reboot
pm2 logs enshido-api          # xem log
```
> Đặt `--cwd ./api` cho API để `uploads/` và `.env` được đọc đúng.

### 4.5 (Tùy chọn) Reverse proxy + HTTPS bằng Nginx
```nginx
# API: https://api.congty.vn  →  127.0.0.1:4000
server {
  server_name api.congty.vn;
  client_max_body_size 20m;              # cho ảnh QC/base64
  location / { proxy_pass http://127.0.0.1:4000; proxy_set_header Host $host; }
}
# Web: https://app.congty.vn →  127.0.0.1:3000
server {
  server_name app.congty.vn;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
}
```
Rồi cấp SSL bằng `certbot --nginx`. Nhớ đặt `WEB_ORIGIN=https://app.congty.vn` và `NEXT_PUBLIC_API_URL=https://api.congty.vn`.

---

## 5. Chuyển SQLite → PostgreSQL

Schema đã thiết kế **portable**: các trường "enum" lưu dạng `String` (validate ở code theo `@enshido/types`), không dùng kiểu riêng của SQLite — nên đổi provider rất gọn.

### 5.1 Dựng PostgreSQL
```bash
# Cách nhanh bằng Docker (kèm sẵn trong repo):
docker compose up -d postgres        # user/pass/db = enshido/enshido/enshido, cổng 5432
```
Hoặc dùng Postgres managed (RDS, Supabase, Neon…). Ghi lại chuỗi kết nối.

### 5.2 Đổi provider trong Prisma
Sửa `api/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"          // từ "sqlite"
  url      = env("DATABASE_URL")
}
```

### 5.3 Đặt `DATABASE_URL` (Postgres) trong `api/.env`
```bash
DATABASE_URL="postgresql://enshido:enshido@localhost:5432/enshido?schema=public"
```

### 5.4 Tạo schema trên Postgres
Các migration hiện có trong `api/prisma/migrations/` là **SQL của SQLite** → không dùng lại cho Postgres. Chọn 1 trong 2 cách:

**Cách A — Nhanh (đồng bộ thẳng từ schema, không giữ lịch sử migration):**
```bash
cd api
npx prisma db push          # tạo bảng trên Postgres theo schema.prisma
npx prisma generate
cd ..
npm run db:seed             # nạp dữ liệu mẫu (bỏ qua nếu là DB thật)
```

**Cách B — Chuẩn (giữ lịch sử migration cho Postgres):**
```bash
# 1) Lưu lịch sử SQLite ra chỗ khác (không xóa vĩnh viễn nếu còn dùng dev SQLite)
mv api/prisma/migrations api/prisma/migrations.sqlite.bak
# 2) Sinh migration Postgres đầu tiên
cd api && npx prisma migrate dev --name init_postgres && cd ..
# 3) Seed
npm run db:seed
```
> Ở prod, sinh migration trên máy dev (Cách B), commit thư mục `migrations` mới, rồi trên server chạy `npx prisma migrate deploy`.

### 5.5 Build lại & kiểm chứng
```bash
npm run db:generate         # cập nhật Prisma Client
npm run build -w api        # build lại API
# (khởi động API+Web rồi)
npm run selftest            # phải 212/212 PASS trên Postgres
```

### 5.6 (Tùy chọn) Di chuyển DỮ LIỆU cũ từ SQLite sang Postgres
Nếu SQLite đang có dữ liệu thật cần giữ:
- **pgloader** (khuyến nghị): `pgloader ./api/prisma/dev.db postgresql://enshido:enshido@localhost:5432/enshido`
- Hoặc script Node đọc từng bảng qua Prisma (SQLite) → ghi sang Prisma (Postgres). Lưu ý thứ tự phụ thuộc khóa ngoại (users/customers/employees → orders → items/steps → weight/qc…).
- Sau khi nhập, chạy `npm run selftest` **chỉ trên DB thử**, không chạy lên DB prod thật (selftest tạo/sửa dữ liệu).

---

## 6. Hạ tầng prod đầy đủ (tùy chọn): Redis + MinIO

`docker-compose.yml` kèm sẵn **postgres + redis + minio** (chỉ hạ tầng — app vẫn chạy bằng Node như §4).

```bash
docker compose up -d          # postgres :5432 · redis :6379 · minio :9000 (console :9001)
```
- **Redis**: dùng cho blacklist refresh-token / cache khi mở rộng (hiện JWT stateless; đây là bước nâng cấp).
- **MinIO/S3**: lưu ảnh thay cho disk. Hiện `STORAGE_DRIVER=disk` là đường mặc định đã chạy tốt; nếu muốn S3, gắn `uploads/` vào volume bền là đủ cho phần lớn nhu cầu, hoặc bổ sung driver S3 sau.

---

## 7. Checklist bảo mật khi lên prod

- [ ] Đổi `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET` thành chuỗi ngẫu nhiên mạnh (vd `openssl rand -hex 32`).
- [ ] **Không commit** `api/.env` / `apps/web/.env.local` vào git.
- [ ] Bật HTTPS (Nginx + certbot); đặt `WEB_ORIGIN`/`NEXT_PUBLIC_API_URL` theo domain thật.
- [ ] Đổi mật khẩu tài khoản demo (`123456`) hoặc xóa; tạo tài khoản thật qua **Nhân sự** (mật khẩu ngẫu nhiên).
- [ ] Sao lưu DB định kỳ (`pg_dump`) + backup thư mục `uploads/`.
- [ ] Giới hạn cổng 4000/5432 chỉ nội bộ (chỉ mở 3000/443 ra ngoài qua proxy).

---

## 8. Sự cố thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Web không gọi được API (CORS) | `WEB_ORIGIN` (API) chưa chứa origin web; hoặc `NEXT_PUBLIC_API_URL` sai. |
| Đổi URL API mà web vẫn gọi localhost | Chưa **build lại web** sau khi đổi `NEXT_PUBLIC_API_URL`. |
| QR quét từ điện thoại không mở | Đặt `PUBLIC_WEB_ORIGIN` = URL/IP truy cập được từ điện thoại (cùng LAN hoặc domain). |
| `prisma migrate` lỗi trên Postgres | Migration cũ là SQLite → dùng §5.4 (db push hoặc sinh migration mới). |
| Mất ảnh sau redeploy | `uploads/` phải là **volume bền**, không nằm trong thư mục bị ghi đè khi deploy. |
| Ảnh QC/base64 bị 413 | Tăng `client_max_body_size` ở Nginx (API đã nhận tới 15MB). |

Xem thêm: [`README.md`](../README.md), [`spec-kit/specs/001-mvp-core/quickstart.md`](../spec-kit/specs/001-mvp-core/quickstart.md).
