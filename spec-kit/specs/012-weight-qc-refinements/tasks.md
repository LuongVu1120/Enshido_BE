# Tasks: Phase 012 — Tinh chỉnh Trọng lượng & QC

**Branch**: `012-weight-qc-refinements` | **Spec**: `./spec.md` | **Plan**: `./plan.md`
**Depends on**: 001, 009, 010. *(✅ Đã code & verify — selftest 205/205.)*

## A. Trọng lượng (Đơn hàng)
- [x] T1201 [SEED] Sửa `weight_logs.stageName` → `STEP_LABELS[flow[i]]` (tiếng Việt). *(FR-001)*
- [x] T1202 [WEB] Bảng trọng lượng: map `stageName` mã enum → nhãn tiếng Việt (phòng dữ liệu cũ). *(FR-001)*
- [x] T1203 [API] `CreateWeightLogDto.measuredById?`; `weight.create` lưu người cân theo lựa chọn (mặc định user hiện tại), audit vẫn ghi người thao tác thực. *(FR-003)*
- [x] T1204 [WEB] Form nhập cân: **Select công đoạn** (order.steps, nhãn VN) → set stageName + productionStepId; **Select người cân**. *(FR-002,003)*
- [x] T1205 [WEB] Bảng trọng lượng: **gộp 1 dòng/công đoạn** (mới nhất) + mở **lịch sử cân**; trùng công đoạn → prefill số cũ. *(FR-004)*

## B. QC kiểm tra
- [x] T1206 [API] `QCFailDto`: `returnStepId?`, `severity?` (tùy chọn); `defectType` = tên lỗi (bắt buộc). *(FR-006)*
- [x] T1207 [API] `qc.fail`: tự chọn công đoạn trả về khi thiếu; `note = sanitizeRichText(note)`. *(FR-006,007)*
- [x] T1208 [WEB] Form trả lỗi rút gọn: **Tên lỗi (text) + Mô tả (RichText) + Ảnh (tùy chọn)**; bỏ mức độ/công đoạn trả về/giao thợ/deadline. Giữ 8 tiêu chí. *(FR-005)*
- [x] T1209 [WEB] Lịch sử QC: render `note` bằng `RichTextView`. *(FR-007)*

## C. Kiểm thử & tài liệu
- [x] T1210 [TEST] selftest: người cân đúng + append log/công đoạn; QC fail chỉ tên lỗi + mô tả (strip script) → NEEDS_REWORK + returnStep auto. *(SC-002,003,004)*
- [x] T1211 [VERIFY] build · seed · selftest xanh · unit 6/6 · screenshot.
- [x] T1212 [DOCS] ROADMAP/README/REPORT + memory.

## Map US → Tasks
| US | Tasks |
|---|---|
| US1 Tiếng Việt | T1201, T1202 |
| US2 Chọn công đoạn + người cân | T1203, T1204 |
| US3 Trùng = sửa (hiển thị) | T1205 |
| US4 QC form text | T1206, T1207, T1208, T1209 |
| Verify/Docs | T1210, T1211, T1212 |
