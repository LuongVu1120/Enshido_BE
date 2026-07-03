# Tasks: QC Inspection Workspace — ENSHIDO

**Branch**: `009-qc-inspection` | **Spec**: `./spec.md` | **Depends on**: 001, 007.

- [x] T901 [WEB] **Bugfix**: `Card` forward `onClick` (thẻ đơn QC bấm được). *(FR-001, SC-001)*
- [x] T902 `@enshido/types`: `QC_CHECKLIST` (8 tiêu chí + critical) + `QcCheckValue` + nhãn. 
- [x] T903 Prisma: `qc_records.checklist` (JSON string) + migration. *(FR-002)*
- [x] T904 [API] `GET /qc/stats` (pending/passedToday/failedToday/passRateToday). *(FR-003)*
- [x] T905 [API] pass/fail nhận `checklist` (string) + `orderItemId`; lưu nguyên; listForQC kèm weightLogs (cảnh báo hao hụt) + qcUser. *(FR-004)*
- [x] T906 [WEB] Viết lại `/qc` thành **phiếu kiểm**: thông tin SP + ảnh + hao hụt cảnh báo; chọn SP; checklist Đạt/Lỗi/Bỏ; 3 nút Đạt/Cần sửa/Không đạt; form trả lỗi + ảnh; lịch sử kiểm; thanh thống kê. *(FR-005)*
- [x] T907 [WEB] Thêm variant nút `warning` (amber) cho "Cần sửa".
- [x] T908 [TEST] Selftest: /qc/stats; QC cần sửa kèm checklist → lưu đúng (có tiêu chí lỗi) + gắn orderItemId + đơn về NEEDS_REWORK.

## Map US → Tasks
| US | Tasks |
|---|---|
| US1 | T901 |
| US2 | T902, T903, T905, T906 |
| US3 | T906, T907 |
| US4 | T905, T906 |
| US5 | T904, T906 |
