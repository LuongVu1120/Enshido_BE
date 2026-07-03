# ENSHIDO Jewelry — Roadmap triển khai & Tech Stack

**Hệ thống**: Phần mềm quản lý đơn hàng sản xuất xưởng kim hoàn.
**6 trục nghiệp vụ**: Khách hàng → Đơn hàng → Sản xuất → Trọng lượng → QC → Tồn kho.
**Nền tảng**: Web app nội bộ (desktop + tablet) cho quản lý/QC/kho/kế toán; **PWA mobile** cho thợ quét QR.

---

## A. Tổng quan 5 phase

```text
 Phase 001 ──► Phase 002 ──► Phase 003 ──► Phase 006 ──► Phase 004 ──► Phase 005
   MVP          Inventory      Reports     Refinement       HR         Automation
 (xương sống)  (tồn kho)     (báo cáo)   (tinh chỉnh)   (nhân sự)    (tự động hóa)
   ✅ DONE       ✅ DONE        ✅ DONE       ✅ DONE       ✅ P1 DONE    ✅ DONE

🎉 Toàn bộ roadmap đã triển khai (004 còn P2: chấm công/ca/lương đầy đủ).

➕ **Phase 007 (tinh chỉnh, ✅ DONE):** mỗi nhân sự đều có account (tạo NV tự cấp + mật khẩu ngẫu nhiên + admin reset); tín công theo **người thực hiện thực tế** (ai quét QR thao tác) — worklog/năng suất/KPI tính theo `performedById`. Xem `specs/007-account-performer/`.

➕ **Phase 008 (✅ DONE):** review fixes — tự gia hạn phiên, QC ảnh lỗi, "Việc của tôi", đổi mật khẩu, siết RBAC, phân trang. `specs/008-review-fixes/`.
➕ **Phase 009 (✅ DONE):** nâng cấp QC — phiếu kiểm theo bộ tiêu chí + thống kê + theo SP; sửa bug `Card` onClick. `specs/009-qc-inspection/`.
➕ **Phase 010 (✅ DONE):** tên đơn (mặc định = mã đơn) · ghi chú đơn **rich content (TipTap)** + sanitize server-side · sửa hồ sơ nhân viên từ UI (đồng bộ tên tài khoản). `specs/010-order-naming-notes-employee-edit/`.
➕ **Phase 011 (✅ DONE):** **lô sản xuất** — gom nhiều đơn cùng công đoạn (Đúc/Xi mạ), cân tổng cả lô → phân bổ hao hụt về từng đơn theo tỉ lệ KL (+ sửa tay), giữ toàn vẹn hao hụt per-đơn (HP III); + Kanban theo công đoạn. `specs/011-production-batch/`.
➕ **Phase 012 (✅ DONE):** tinh chỉnh — công đoạn cân hiển thị tiếng Việt; nhập cân chọn công đoạn + người cân (trùng = sửa, vẫn lưu log); QC trả lỗi rút gọn (tên lỗi + mô tả rich + ảnh, tự chọn công đoạn trả về). `specs/012-weight-qc-refinements/`.
➕ **Phase 013 (✅ DONE):** QR phiếu dùng IP LAN (dev) + hiển thị URL đích (quét từ điện thoại/app ngoài); màn quét thợ có chế độ **Gom lô** (quét liên tục nhiều QR → 1 lô); quét xong nhập **KL tiếp nhận** (tùy chọn). `specs/013-qr-scan-enhancements/`.
```

> **Cập nhật sau review (2026-06-10):** Ưu tiên **tinh chỉnh phần đã làm** trước khi thêm tính năng mới.
> - **006 — Order Board & Order Mgmt Refinements** *(mới, làm trước 004)*: Kanban đổi từ "theo công đoạn" → **bảng trạng thái ĐƠN HÀNG (Todo/Doing/Done)**; hoàn thiện quản lý đơn (sửa đơn/SP, upload ảnh, chi tiết khách). Xem `specs/006-order-board-refinements/`.
> - **004 — HR** được reprioritize: **Hồ sơ nhân viên + "công việc theo tháng của nhân viên"** là P1 cốt lõi. Xem `specs/004-hr-workforce/` (US1 + US6).

Nguyên tắc cắt phase theo spec-kit: **mỗi phase là một feature độc lập, deliver được giá trị riêng**. Trong từng phase, các *user story* được gắn ưu tiên **P1 (bắt buộc) / P2 (nên có) / P3 (mở rộng)** và có thể build–test–demo độc lập.

---

### Phase 001 — MVP Core 🔴 *(bắt buộc làm trước)*

> Mục tiêu: chạy được trọn vẹn luồng **tạo đơn → in phiếu QR → thợ quét cập nhật công đoạn → nhập trọng lượng & tính hao hụt → QC pass/fail → dashboard cơ bản**. Đây là phần tạo ra giá trị ngay cho xưởng.

Bao gồm (user story chính):

- **P1** — Đăng nhập & phân quyền cơ bản (RBAC theo 6 vai trò).
- **P1** — Quản lý khách hàng (CRUD, lịch sử đơn).
- **P1** — Quản lý đơn hàng + sản phẩm trong đơn (mã đơn `SX-YYYYMMDD-####`, trạng thái, deadline, ưu tiên).
- **P1** — Quy trình & công đoạn sản xuất (chọn công đoạn áp dụng cho từng đơn).
- **P1** — Phiếu sản xuất + sinh QR token (in phiếu).
- **P1** — Màn hình thợ quét QR / cập nhật nhanh (mobile-first): tiếp nhận → bắt đầu → hoàn thành → nhập trọng lượng → báo lỗi → upload ảnh.
- **P1** — Theo dõi trọng lượng & hao hụt (tự tính gram/%, lũy kế, cảnh báo vượt định mức).
- **P1** — QC: PASS / FAIL / CẦN SỬA, danh mục lỗi, trả về đúng công đoạn.
- **P2** — Kanban sản xuất (kéo–thả, lọc, tìm kiếm).
- **P2** — Dashboard cơ bản (chỉ số + vài biểu đồ cốt lõi).
- **P2** — Nhật ký thao tác (activity log, immutable).
- **P3** — Danh mục sản phẩm & cài đặt danh mục cơ bản.

Phụ thuộc: không (nền móng). **Mọi phase sau đều phụ thuộc 001.**

---

### Phase 002 — Inventory (Tồn kho) 🟠

> Mục tiêu: kiểm soát vật tư đầu vào và thành phẩm đầu ra, gắn với đơn sản xuất.

- **P1** — Danh mục vật tư & nhóm kho (nguyên liệu, đá, phụ kiện, hóa chất xi/mạ, bao bì, bán thành phẩm, thành phẩm).
- **P1** — Nhập kho (phiếu nhập, NCC, đơn giá).
- **P1** — Xuất kho theo đơn / công đoạn.
- **P1** — Nhập kho thành phẩm (tự kích hoạt sau khi QC PASS — nối với 001).
- **P2** — Cảnh báo tồn tối thiểu / sắp hết / hết hàng.
- **P2** — Chuyển kho.
- **P3** — Định giá tồn kho.

Phụ thuộc: **001** (đơn hàng, công đoạn, QC pass để nhập kho thành phẩm).

---

### Phase 003 — Reports & Analytics 🟡

> Mục tiêu: biến dữ liệu vận hành thành báo cáo ra quyết định; hoàn thiện dashboard.

- **P1** — Báo cáo đơn hàng & sản xuất (sản lượng/ngày, công đoạn tắc, thời gian xử lý TB).
- **P1** — Báo cáo QC (tỷ lệ pass/fail, lỗi theo công đoạn/thợ/sản phẩm/khách).
- **P1** — Báo cáo hao hụt trọng lượng (theo công đoạn/thợ/loại sản phẩm; danh sách vượt định mức).
- **P2** — Báo cáo năng suất thợ (xếp hạng, đúng hạn, tỷ lệ lỗi).
- **P2** — Báo cáo tồn kho (cần 002).
- **P2** — Dashboard nâng cao (đủ biểu đồ như mockup).
- **P3** — Xuất Excel/PDF cho mọi báo cáo.

Phụ thuộc: **001** (dữ liệu sản xuất/QC/hao hụt); **002** cho báo cáo tồn kho.

---

### Phase 004 — HR & Workforce (Nhân sự) 🟢

> Mục tiêu: quản lý con người — tiền đề cho KPI/lương theo sản lượng ở 005. (Theo mockup "Quản lý nhân sự": phòng ban, chấm công, ca, lương.)

- **P1** — Hồ sơ nhân viên (phòng ban, chức vụ, trạng thái làm việc/nghỉ).
- **P1** — Vai trò & phân quyền nâng cao (mở rộng RBAC của 001; khóa tài khoản nhân viên nghỉ việc).
- **P2** — Chấm công (công ngày/giờ, đi muộn/về sớm).
- **P2** — Ca làm việc.
- **P2** — Lương thưởng (khung lương; số liệu sản lượng lấy từ 003).

Phụ thuộc: **001** (users/roles). Liên kết số liệu với **003**.

---

### Phase 005 — Automation & Integrations 🔵

> Mục tiêu: giảm thao tác thủ công, tối ưu vận hành, kết nối hệ sinh thái bán hàng/kế toán.

- **P2** — Cảnh báo nguy cơ trễ đơn (dựa trên tiến độ công đoạn vs deadline).
- **P2** — Gợi ý phân công thợ (theo tải việc/kỹ năng).
- **P2** — Tính KPI & lương theo sản lượng (nối 003 + 004).
- **P2** — Tính giá vốn sản phẩm (vật tư từ 002 + công thợ + hao hụt).
- **P3** — Tích hợp Shopee/Lazada/TikTok Shop + phần mềm kế toán.

Phụ thuộc: **001–004** (đây là lớp trên cùng).

---

## B. Bản đồ Mockup → Phase

| Mockup (trong `requirement/`) | Phase |
|---|---|
| Dashboard tổng quan | 001 (cơ bản) → 003 (đầy đủ) |
| Danh sách đơn hàng + Chi tiết đơn hàng | 001 |
| Kanban sản xuất | 001 |
| Phiếu sản xuất (QR) | 001 |
| QC kiểm tra | 001 |
| Quản lý tồn kho | 002 |
| Quản lý nhân sự (chấm công, lương, ca) | 004 |

---

## C. Tech Stack & Architecture

> Toàn hệ thống dùng **một stack TypeScript thống nhất** (FE + BE chung ngôn ngữ, chung type) để tối ưu tốc độ phát triển và giảm lỗi tích hợp. Đây là phần "cái NHƯ THẾ NÀO" — đưa vào `/speckit.plan`.

### Kiến trúc tổng thể

```text
┌────────────────────┐     ┌────────────────────┐
│  Web Admin (Next)  │     │  PWA Thợ (Next)    │
│ desktop / tablet   │     │  mobile, quét QR    │
└─────────┬──────────┘     └─────────┬──────────┘
          │  HTTPS REST + WebSocket (realtime Kanban/Dashboard)
          ▼                          ▼
        ┌───────────────────────────────────┐
        │        API — NestJS (REST)         │
        │  Auth/RBAC · Orders · Production    │
        │  QC · Weight · Inventory · Reports  │
        └───┬───────────────┬──────────┬─────┘
            ▼               ▼          ▼
     PostgreSQL          Redis      S3/MinIO
   (dữ liệu chính)  (cache/queue)  (ảnh, file)
```

### Frontend

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| Framework | **Next.js (App Router) + React + TypeScript** | SSR/CSR linh hoạt, 1 codebase cho Web Admin + PWA thợ |
| UI | **TailwindCSS + shadcn/ui (Radix)** | Khớp phong cách mockup (sạch, hiện đại), build nhanh |
| Data fetching | **TanStack Query** | Cache, đồng bộ server state, optimistic update |
| State (client) | **Zustand** | Nhẹ, đủ dùng |
| Bảng dữ liệu | **TanStack Table** | Đơn hàng/tồn kho/nhân sự nhiều cột, lọc, phân trang |
| Kanban kéo–thả | **dnd-kit** | Kéo thẻ giữa các cột công đoạn |
| Biểu đồ | **Recharts** (hoặc Tremor) | Dashboard: tiến độ, QC, sản lượng, hao hụt |
| Form & validate | **react-hook-form + Zod** | Form tạo đơn/nhập trọng lượng/QC chặt chẽ |
| PWA | **Serwist (next-pwa)** | Cài lên điện thoại thợ, dùng nhanh ngoài xưởng |
| Quét QR | **@zxing/browser** / **html5-qrcode** | Mở camera quét phiếu sản xuất |

### Backend

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| Framework | **NestJS + TypeScript** | Cấu trúc module rõ ràng, guard/interceptor cho RBAC & audit |
| API | **REST** (khớp danh sách API trong tài liệu) + **OpenAPI/Swagger** | Hợp đồng API rõ ràng, tự sinh docs |
| Realtime | **WebSocket (Socket.IO gateway)** | Cập nhật Kanban/Dashboard tức thời khi thợ báo xong công đoạn |
| ORM | **Prisma** | Type-safe, migration tốt, khớp 12 bảng trong tài liệu |
| Auth | **JWT (access + refresh) + Passport**, hash mật khẩu **Argon2** | Phân quyền theo vai trò; QR yêu cầu đăng nhập |
| Hàng đợi/Job | **BullMQ (trên Redis)** | Sinh QR/PDF, build báo cáo, gửi cảnh báo |
| Sinh QR | **qrcode** | QR chứa **token** (không nhúng dữ liệu nhạy cảm), link `/scan/{qr_token}` |
| Xuất PDF | **Puppeteer** (HTML→PDF) | Phiếu sản xuất & báo cáo bám sát layout mockup |
| Xuất Excel | **ExcelJS** | Báo cáo phase 003 |

### Dữ liệu & hạ tầng

| Hạng mục | Lựa chọn | Ghi chú |
|---|---|---|
| CSDL | **PostgreSQL** | Khuyến nghị hơn MySQL: JSON tốt, transaction/đồng thời mạnh, hợp phân tích báo cáo |
| Cache / session / queue | **Redis** | Cache dashboard, BullMQ, adapter WebSocket |
| Lưu file | **S3-compatible** (AWS S3 hoặc **MinIO** self-host) | Ảnh sản phẩm, ảnh lỗi QC, file thiết kế; upload qua presigned URL |
| Monorepo | **Turborepo** (hoặc Nx) | `apps/web`, `apps/api`, `packages/types` dùng chung type |
| Đóng gói/triển khai | **Docker + Docker Compose** | Web app nội bộ; có thể đưa lên cloud |
| CI/CD | **GitHub Actions** | Lint, test, build, migrate |
| Backup | **pg_dump** định kỳ (cron) hoặc managed Postgres | Tài liệu yêu cầu backup định kỳ |
| Log & lỗi | **pino** + **Sentry** (tùy chọn) | Quan sát vận hành |

### Cross-cutting (xuyên suốt mọi phase)

- **RBAC** kiểm soát ở server theo 6 vai trò: Admin/Chủ xưởng, Quản lý sản xuất, Thợ, QC, Kho, Kế toán.
- **Audit log immutable** (bảng `activity_logs`, append-only): ghi mọi đổi trạng thái đơn, người nhập trọng lượng, người QC, người sửa dữ liệu — không cho xóa/sửa.
- **QR bảo mật bằng token**: không nhúng thông tin nhạy cảm; chưa đăng nhập thì yêu cầu login; có thể vô hiệu hóa QR khi hủy đơn.
- **i18n**: tiếng Việt là ngôn ngữ chính.
- **Quy ước mã**: đơn `SX-YYYYMMDD-####`, phiếu `PSX-YYYYMMDD-####`, khách `KH-######`, vật tư `VT-######`.

### Đề xuất phi chức năng (đưa vào Success Criteria của các spec)

- Màn hình thợ: thao tác cập nhật công đoạn xong trong **3–5 giây**.
- API danh sách lớn: phân trang + index, p95 **< 300ms** ở quy mô ~vài trăm đơn đang chạy (mockup hiển thị 286 đơn).
- Dashboard/Kanban cập nhật realtime sau khi thợ báo xong công đoạn.

---

## D. Gợi ý thứ tự thực thi trong từng phase

1. `/speckit.clarify` → chốt các điểm `[NEEDS CLARIFICATION]` trong spec.
2. `/speckit.plan` → tech stack (mục C ở trên) + data-model + contracts.
3. `/speckit.tasks` → chia task theo user story, ưu tiên P1 trước.
4. `/speckit.analyze` → kiểm tra nhất quán spec ↔ plan ↔ tasks.
5. `/speckit.implement` → build P1 → demo → P2 → P3.
