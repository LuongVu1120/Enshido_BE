# Tasks: Phase 010 — Tên đơn · Ghi chú rich · Sửa hồ sơ NV

**Branch**: `010-order-naming-notes-employee-edit` | **Spec**: `./spec.md` | **Plan**: `./plan.md`
**Depends on**: 001, 004, 006. Đánh dấu `[x]` khi hoàn thành & verify.

## Backend

- [x] T1001 [TYPES] `@enshido/types`: thêm `orderDisplayName(o)` (name||code) + export; build `prepare`. *(FR-002)*
- [x] T1002 [DB] Prisma: `Order.name String?` + migration cộng dồn (SQLite). *(FR-001)*
- [x] T1003 [API] `common/sanitize.util.ts`: `sanitizeRichText()` theo whitelist (tag/`a`-href/loại `on*`,`script`,`style`,`javascript:`). *(FR-003, SC-002)*
- [x] T1004 [API] `orders/dto.ts`: `CreateOrderDto`+`UpdateOrderDto` thêm `name?` (IsOptional/IsString). *(FR-001)*
- [x] T1005 [API] `orders.service`: create/update lưu `name` + `note=sanitizeRichText(note)`; `list()` select `name` + tìm theo `name`. *(FR-001,003)*
- [x] T1006 [API] `production.service.board()`: select `name`; card trả `name`. *(FR-002 — Kanban)*
- [x] T1007 [API] `employees.service.update()`: đổi `name` → đồng bộ `user.name` liên kết. *(FR-005)*

## Frontend

- [x] T1008a [WEB] `npm i` (web): `@tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-underline`. *(FR-003)*
- [x] T1008 [WEB] `components/rich-text.tsx`: `RichText` (**TipTap** `useEditor` `immediatelyRender:false` + StarterKit/Underline/Link, toolbar B/I/U/S, bullet, số, link, xóa định dạng) + `RichTextView` (render HTML đã sanitize / fallback text thuần pre-wrap; **không** nạp TipTap). *(FR-003,004,006)*
- [x] T1009 [WEB] `orders/new`: field **Tên đơn** + `note` → `<RichText>`. *(US1,US2)*
- [x] T1010 [WEB] `orders/[id]/edit`: **Tên đơn** điền sẵn + `note` → `<RichText>`. *(US1,US2)*
- [x] T1011 [WEB] `orders/[id]`: tiêu đề = `orderDisplayName`, mã đơn → badge/subtitle; thêm card **Ghi chú** (`RichTextView`). *(US1,US2,FR-004)*
- [x] T1012 [WEB] `orders/page`: cột "Tên đơn / Mã đơn" (tên đậm + mã mờ). *(US1)*
- [x] T1013 [WEB] `kanban/page` + `components/ticket-modal`: hiển thị tên đơn + mã. *(US1)*
- [x] T1014 [WEB] `employees/[id]`: nút **✏️ Sửa thông tin** (ADMIN/ACCOUNTANT) → modal điền sẵn → `PUT /employees/:id` → invalidate. *(US3,FR-005)*

## Dữ liệu & kiểm thử

- [x] T1015 [SEED] `prisma/seed.ts`: đặt `name` cho 1–2 đơn mẫu (phần còn lại trống → minh hoạ fallback). *(SC-001)*
- [x] T1016 [TEST] `selftest.mjs` section 010: name lưu/fallback; note strip `<script>` giữ `<b>`; sửa NV đổi field + đồng bộ `user.name`. *(SC-001,002,003)*
- [x] T1017 [VERIFY] build types/api/web · migrate · seed · `npm run selftest` xanh · `npm test` 6/6 · chụp màn hình. *(SC-004)*
- [x] T1018 [DOCS] cập nhật ROADMAP/README/REPORT + memory (`enshido-spec-kit-phases`). 

## Map US → Tasks
| US | Tasks |
|---|---|
| US1 Tên đơn | T1001, T1002, T1004, T1005, T1006, T1009–T1013, T1015 |
| US2 Ghi chú rich | T1003, T1005, T1008, T1009, T1010, T1011 |
| US3 Sửa NV | T1007, T1014 |
| Verify/Docs | T1016, T1017, T1018 |
