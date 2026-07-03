# Feature Specification: Tinh chỉnh Trọng lượng & QC (MVP)

**Feature Branch**: `012-weight-qc-refinements`
**Created**: 2026-07-02
**Status**: Draft (chờ duyệt)
**Depends on**: `001-mvp-core` (trọng lượng, QC), `009` (bộ tiêu chí QC), `010` (RichText + sanitize).

## Bối cảnh & phát hiện (rà soát)

**A. Đơn hàng → Theo dõi trọng lượng & hao hụt**
- **Bug hiển thị**: seed lưu `weight_logs.stageName = flow[i]` = **mã enum thô** (`api/prisma/seed.ts:228`) → bảng hiện "CASTING", "FILING"… thay vì "Đúc", "Làm nguội". (Luồng thợ quét QR đã ra tiếng Việt; chỉ seed + nhập tay desktop bị.)
- Form "Nhập cân" dùng **ô text tự gõ** cho công đoạn → nên là **select công đoạn** của đơn (tiếng Việt).
- `weight.create` luôn tín người cân = user hiện tại → cần **chọn người cân**.
- Chưa gộp theo công đoạn → nhập lại cùng công đoạn thành nhiều dòng.

**B. QC kiểm tra** — form "Không đạt / Cần sửa" quá nhiều thao tác cho MVP (loại lỗi dropdown + mức độ + công đoạn trả về **bắt buộc** + giao thợ + deadline + ghi chú + ảnh). Người dùng muốn **giữ bộ 8 tiêu chí**, nhưng form khi bấm "Cần sửa/Không đạt" chỉ **điền text**: **tên lỗi + mô tả (rich text) + ảnh (không bắt buộc)**.

## User Stories *(mandatory)*

### US1 — Công đoạn hiển thị tiếng Việt (P1)
Mọi nơi trong "Theo dõi trọng lượng & hao hụt" (và bảng cân) hiển thị công đoạn bằng **tiếng Việt** (Đúc, Làm nguội…), không phải mã enum.
- **AC**: không còn "CASTING/FILING/…" trên UI; seed lưu nhãn tiếng Việt.

### US2 — Nhập cân chọn công đoạn + người cân (P1)
Form nhập cân: **chọn công đoạn** (select các công đoạn của đơn, tiếng Việt) thay vì gõ tay; **chọn người cân** (mặc định người đang thao tác).
- **AC**: bản ghi cân gắn `productionStepId` + `measuredById` đúng người chọn.

### US3 — Trùng công đoạn = chỉnh sửa (P1)
Nhập cân cho công đoạn đã có → bảng coi như **cập nhật** công đoạn đó: hiển thị **1 dòng/công đoạn** (bản ghi **mới nhất**). Vẫn **lưu log** (không xóa/sửa bản ghi cũ) để truy vết — **giữ Hiến pháp III**; có thể mở "lịch sử cân" của công đoạn.
- **AC**: cân lại cùng công đoạn → bảng vẫn 1 dòng (số mới); log cũ vẫn tồn tại.

### US4 — QC: form trả lỗi rút gọn "điền text" (P1)
Giữ **bộ 8 tiêu chí**. Khi bấm **Cần sửa / Không đạt**, form chỉ gồm: **Tên lỗi** (text ngắn) + **Mô tả** (rich text) + **Ảnh** (tùy chọn). Bỏ khỏi UI: mức độ, công đoạn trả về, giao thợ sửa, deadline.
- **AC**: gửi được với chỉ tên lỗi + mô tả (+ ảnh tùy chọn); đơn về **NEEDS_REWORK**; **server tự chọn công đoạn trả về** (công đoạn sản xuất vừa xong gần nhất).

## Requirements *(mandatory)*
- **FR-001**: UI + seed hiển thị/lưu công đoạn cân bằng **tiếng Việt** (`STEP_LABELS`); layer hiển thị map `StepName`→nhãn (phòng dữ liệu cũ).
- **FR-002**: Form nhập cân = **Select công đoạn** của đơn (đính `productionStepId`, stageName = nhãn tiếng Việt).
- **FR-003**: `CreateWeightLogDto.measuredById?` (tùy chọn) — `weight.create` lưu người cân theo lựa chọn (mặc định user hiện tại); **audit vẫn ghi người thao tác thực**.
- **FR-004**: Bảng trọng lượng gộp **1 dòng/công đoạn** (mới nhất theo `productionStepId`/stageName); **weight_logs vẫn append-only**; xem được lịch sử cân của công đoạn.
- **FR-005**: Form QC trả lỗi rút gọn: `defectType` = **tên lỗi (text tự do)**, `note` = **rich text**, `imageUrls` tùy chọn. Giữ bộ tiêu chí (checklist) như cũ.
- **FR-006**: `QCFailDto`: `returnStepId`, `severity` → **tùy chọn**. `qc.fail` **tự chọn công đoạn trả về** khi thiếu (công đoạn SX `DONE` có `stepOrder` lớn nhất, loại QC/Nhập kho; fallback công đoạn SX đầu).
- **FR-007**: Mô tả lỗi QC lưu **rich text đã sanitize** (tái dùng `sanitizeRichText` — Phase 010); lịch sử QC render có định dạng.

## Success Criteria *(mandatory)*
- **SC-001**: Bảng trọng lượng + form không còn mã enum; toàn tiếng Việt.
- **SC-002**: Nhập lại cùng công đoạn → bảng 1 dòng (số mới), log cũ còn trong lịch sử.
- **SC-003**: Người cân hiển thị đúng người được chọn.
- **SC-004**: QC "Không đạt/Cần sửa" chỉ cần tên lỗi + mô tả (+ ảnh) → đơn NEEDS_REWORK, công đoạn trả về tự chọn đúng; mô tả `<script>` bị strip.
- **SC-005**: `npm run selftest` xanh; `npm test` 6/6.

## Out of scope
- Không đổi schema (tận dụng `weight_logs.measuredById` sẵn có; QC chỉ nới DTO).
- Không đổi luồng "Đạt" (vẫn có thể chấm 8 tiêu chí rồi bấm Đạt).
- Không tính lại hao hụt lũy kế lịch sử khi sửa (mỗi log giữ số tại thời điểm cân — hiển thị lấy log mới nhất/công đoạn).
