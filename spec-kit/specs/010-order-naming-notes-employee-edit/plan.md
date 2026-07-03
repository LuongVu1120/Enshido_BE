# Implementation Plan: Phase 010 — Tên đơn · Ghi chú rich · Sửa hồ sơ NV

**Spec**: `./spec.md` · **Branch**: `010-order-naming-notes-employee-edit`
**Nguyên tắc Hiến pháp liên quan**: I (RBAC server-side), II (audit), VI (Security by default), V (incremental).

## 1. Quyết định kỹ thuật chính

### 1.1 Rich text — chọn **TipTap (WYSIWYG)** *(quyết định người dùng 2026-06-19)*
| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| A. contenteditable + sanitizer tự viết | 0 dep mới, gọn | toolbar tự viết, ít tính năng | ❌ |
| **B. TipTap (ProseMirror)** | WYSIWYG chuẩn, mở rộng được, output HTML sạch | +deps (`@tiptap/*`), cần cấu hình SSR Next.js | ✅ **Chọn** |
| C. Markdown lưu thô + render | an toàn HTML | UX kém "rich", cần parser MD | ❌ |

**Thư viện thêm** (`apps/web`): `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-underline`.
- `StarterKit` cung cấp: **đậm/nghiêng/gạch ngang, danh sách chấm & đánh số, heading, blockquote, code, xuống dòng**; thêm **underline** + **link**.
- **Next.js App Router**: `RichText` là client component, khởi tạo `useEditor({ immediatelyRender: false })` để tránh lệch hydration; lấy nội dung bằng `editor.getHTML()`.

**Lưu trữ**: HTML từ TipTap, **vẫn sanitize ở server** trước khi ghi vào `Order.note` (SQLite `TEXT`).
**An toàn (Hiến pháp VI — defense-in-depth, không tin client)**: sanitize **ở server** khi create/update (nguồn sự thật) + `RichTextView` render bằng `dangerouslySetInnerHTML` chỉ với HTML đã sanitize. Whitelist:
- Tag cho phép: `p br b strong i em u s ul ol li a h1 h2 h3 blockquote code pre`.
- `a`: chỉ giữ `href` bắt đầu `http://|https://|mailto:`; tự gắn `target="_blank" rel="noopener nofollow"`.
- Loại bỏ: mọi tag khác (giữ text bên trong), mọi thuộc tính `on*`, `style`, `class`, `srcset`, và href `javascript:`/`data:`.
- Ghi chú cũ (text thuần, không có tag) → render escape + `white-space: pre-wrap` (FR-006).

> Vì TipTap chạy ở client, sanitize **server-side là bắt buộc** (client có thể gửi HTML bất kỳ). `RichTextView` chỉ là khối hiển thị HTML đã sanitize — **không** cần nạp TipTap để hiển thị (tránh tăng bundle ở mọi trang xem).

### 1.2 Tên hiển thị đơn — helper dùng chung
`orderDisplayName(o: {name?: string|null; code: string}) => o.name?.trim() || o.code` đặt trong `packages/types` để FE/BE/ticket dùng **một nguồn**. Mã đơn luôn hiển thị phụ (badge/subtitle) vì là định danh chính thức và là khóa tìm kiếm.

### 1.3 Sửa hồ sơ NV — chỉ bù khoảng trống frontend
Backend đã đủ (`PUT /employees/:id` + `service.update`). Việc còn lại:
- Thêm form sửa (modal) ở trang chi tiết NV, điền sẵn dữ liệu.
- Nâng nhẹ `service.update`: khi `name` đổi và có `user` liên kết → cập nhật `user.name` (đồng bộ FR-005). Audit log đã có.

## 2. Thay đổi dữ liệu (Data Model)

`Order` thêm:
```prisma
name String?  // tên đơn dễ đọc; trống → hiển thị code (Phase 010)
```
- Migration cộng dồn (SQLite dev). `note` giữ nguyên kiểu `String?` (nay chứa HTML đã sanitize).
- Không đổi bảng `Employee` (đã đủ trường).

## 3. Thay đổi API

| Vùng | Thay đổi |
|---|---|
| `orders/dto.ts` | `CreateOrderDto` + `UpdateOrderDto`: thêm `@IsOptional() @IsString() name?`. (`note` đã có) |
| `common/sanitize.util.ts` *(mới)* | `sanitizeRichText(html?: string): string|undefined` theo whitelist §1.1 |
| `orders.service.ts` | `create`/`update`: lưu `name`; chạy `note = sanitizeRichText(dto.note)` trước khi ghi. `list()` select thêm `name`. `detail()` đã trả đủ. |
| `production.service.ts` | `board()` select thêm `name`; card trả `name` để Kanban hiển thị tên. |
| `tickets.service.ts` | đảm bảo phiếu trả `name` (đơn `detail` đã có) — hiển thị ở modal phiếu. |
| `employees.service.ts` | `update()`: nếu `dto.name` đổi & có `user` → `user.update({name})`. |

**RBAC**: không đổi — sửa đơn vẫn ADMIN/PM (Phase 006); sửa NV vẫn ADMIN/ACCOUNTANT (`WRITE`).

## 4. Thay đổi Web

| File | Thay đổi |
|---|---|
| `package.json` (web) | thêm `@tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-underline`. |
| `components/rich-text.tsx` *(mới)* | `RichText` (**TipTap** `useEditor` + StarterKit/Underline/Link + toolbar: B/I/U/S, • list, 1. list, link, xóa định dạng; `immediatelyRender:false`) và `RichTextView` (render HTML đã sanitize / fallback text thuần). |
| `orders/new/page.tsx` | thêm field **Tên đơn**; thay `note <Input>` → `<RichText>`. |
| `orders/[id]/edit/page.tsx` | thêm **Tên đơn**; `note` → `<RichText>` (điền sẵn). |
| `orders/[id]/page.tsx` | tiêu đề = `orderDisplayName`, mã đơn thành badge/subtitle; thêm **card "Ghi chú"** dùng `RichTextView`. |
| `orders/page.tsx` | cột "Tên đơn / Mã đơn": dòng trên tên (đậm), dòng dưới mã (mờ); tìm kiếm vẫn theo mã/khách/SP (bổ sung tìm theo `name`). |
| `kanban/page.tsx` | thẻ hiển thị tên đơn (đậm) + mã (mờ). |
| `components/ticket-modal.tsx` | thêm dòng **Tên đơn** (nếu có). |
| `employees/[id]/page.tsx` | nút **✏️ Sửa thông tin** (ADMIN/ACCOUNTANT) → modal điền sẵn → `PUT /employees/:id`; invalidate query. |

`orders.service.list()` bổ sung `name` vào `where.OR` để tìm theo tên (SC-001 phụ).

## 5. Kiểm thử (`api/test/selftest.mjs`)

Thêm section 010:
- Tạo đơn có `name` → list/detail trả đúng `name`; tạo đơn **không** name → display fallback = `code` (kiểm tra helper qua phản hồi).
- Sửa đơn đặt `note` chứa `<b>ok</b><script>alert(1)</script>` → đọc lại: còn `<b>`, **mất** `<script>` (SC-002).
- `PUT /employees/:id` đổi `position`/`name` → đọc lại đổi đúng; `user.name` đồng bộ (SC-003).
- Unit `loss.spec.ts` giữ 6/6 (không ảnh hưởng).

## 6. Rollout / tương thích

- Migration thêm cột `name` (nullable) — an toàn, không phá dữ liệu cũ.
- Seed: đặt `name` cho 1–2 đơn mẫu để minh hoạ; phần còn lại trống (chứng minh fallback).
- Ghi chú cũ (text thuần) vẫn hiển thị an toàn (escape + pre-wrap).

## 7. Complexity Tracking

- **TipTap**: thêm ~5 gói `@tiptap/*` ở web (tăng bundle trang tạo/sửa đơn). Đổi lại UX WYSIWYG chuẩn, dễ mở rộng. Chỉ nạp ở component editor (lazy/`'use client'`), trang **xem** dùng `RichTextView` thuần nên không gánh bundle.
- Sanitizer **server-side vẫn bắt buộc** (không tin client TipTap): rủi ro XSS khu trú ở 1 hàm + test payload (SC-002). Theo Hiến pháp VI.
- Không thêm hạ tầng backend, không đổi nguyên tắc hiến pháp.

## 8. Thứ tự thực hiện (incremental — Hiến pháp V)

1. types `orderDisplayName` → 2. Prisma `name` + migration → 3. sanitizer util + DTO + orders/board/employees service → 4. `npm i` các gói `@tiptap/*` (web) → 5. `RichText` (TipTap) + `RichTextView` → 6. wiring web (new/edit/detail/list/kanban/ticket/employee) → 7. seed → 8. selftest + verify + screenshots → 9. docs (ROADMAP/README/REPORT/memory).
