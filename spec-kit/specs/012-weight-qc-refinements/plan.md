# Implementation Plan: Phase 012 — Tinh chỉnh Trọng lượng & QC

**Spec**: `./spec.md` · **Branch**: `012-weight-qc-refinements`
**Hiến pháp**: III (log cân bất biến — giữ nguyên), VI (sanitize rich text), II (audit người thao tác thực).

## 1. Quyết định (chốt với người dùng 2026-07-02)
- **Trùng công đoạn = chỉnh sửa** → hiển thị **1 dòng/công đoạn (mới nhất)** nhưng **vẫn append log** (không phá bất biến).
- **QC**: **giữ bộ 8 tiêu chí**; chỉ rút gọn *form trả lỗi* thành **điền text**: tên lỗi + mô tả (rich) + ảnh.
- **Không đổi schema** — tận dụng field sẵn có.

## 2. Không thay đổi Data model
- `weight_logs.measuredById` + relation `measuredBy` **đã có** → chỉ nới DTO.
- QC: dùng lại `qc_records` (defectType/note/imageUrls/checklist) — không thêm cột.

## 3. Backend
| Vùng | Thay đổi |
|---|---|
| `weight/dto.ts` | `CreateWeightLogDto.measuredById?: string` (tùy chọn). |
| `weight.service.create` | `measuredById: dto.measuredById ?? user.id` cho **log**; **audit** vẫn `userId: user.id` (người thao tác thực — HP II). |
| `qc/dto.ts` | `QCFailDto`: `returnStepId?`, `severity?` (tùy chọn); `defectType` giữ bắt buộc (tên lỗi). |
| `qc.service.fail` | Nếu thiếu `returnStepId` → **tự chọn**: công đoạn `DONE` (không phải QC/STOCK_IN) có `stepOrder` lớn nhất; fallback công đoạn không-QC đầu tiên. `note = sanitizeRichText(dto.note)`. |
| `seed.ts` | Đổi `stageName: flow[i]` → `stageName: STEP_LABELS[flow[i]]` (nhãn tiếng Việt). |

RBAC không đổi. Không migration.

## 4. Web
| File | Thay đổi |
|---|---|
| `orders/[id]/page.tsx` — bảng trọng lượng | Hiển thị công đoạn qua `STEP_LABELS` nếu `stageName` là mã enum (phòng dữ liệu cũ). **Gộp 1 dòng/công đoạn** (group theo `productionStepId ?? stageName`, lấy `measuredAt` mới nhất); dòng có "(đã cân N lần)" → mở **lịch sử cân** của công đoạn. |
| `orders/[id]/page.tsx` — form nhập cân | Bỏ ô text; thêm **Select công đoạn** (từ `order.steps`, nhãn tiếng Việt) → set `stageName` + `productionStepId`. Thêm **Select người cân** (`/users?role=WORKER` + người hiện tại; mặc định user hiện tại). Trùng công đoạn → prefill số cũ để "sửa". |
| `qc/page.tsx` — form trả lỗi | Rút gọn còn: **Tên lỗi** (`Input` text), **Mô tả** (`<RichText>`), **Ảnh** (`ImageUpload`, tùy chọn). Bỏ select mức độ/công đoạn trả về/giao thợ/deadline. Giữ nguyên khối 8 tiêu chí phía trên + nút Đạt/Cần sửa/Không đạt. |
| `qc/page.tsx` — lịch sử | Render `note` bằng `<RichTextView>`; bỏ hiển thị "→ công đoạn trả về" nếu không có. |

## 5. Kiểm thử (`selftest.mjs`)
- Nhập cân với `stageName` (nhãn) + `productionStepId` + `measuredById` → log lưu đúng người cân; nhập lại cùng step → có **2 log** (append) nhưng client gộp 1 dòng (kiểm qua số log theo step).
- QC fail chỉ gửi `defectType` (tên lỗi) + `note` (rich, kèm `<script>`) → 201, đơn NEEDS_REWORK, `returnStepId` **tự chọn** không rỗng, `note` đã strip `<script>`.
- Unit hao hụt 6/6 giữ nguyên.

## 6. Complexity Tracking
- Gộp-hiển-thị-latest ở **client** → không đụng backend/bất biến. Rủi ro: cumulative lịch sử không tính lại (chấp nhận, ghi ở spec Out-of-scope).
- QC auto returnStep: 1 hàm chọn thuần, có test.

## 7. Thứ tự
seed fix + display map → weight DTO/service (measuredById) → form cân (select công đoạn + người cân + gộp dòng) → QC DTO/service (optional returnStep/severity + sanitize note + auto returnStep) → QC form rút gọn + history richtext → selftest/verify/screenshot → docs.
