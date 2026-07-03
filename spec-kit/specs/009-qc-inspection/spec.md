# Feature Specification: QC Inspection Workspace

**Feature Branch**: `009-qc-inspection`
**Created**: 2026-06-19
**Status**: Done
**Input**: Yêu cầu — "nghiên cứu nghiệp vụ QC; tab /qc đang quá đơn giản và không tương tác được".
**Depends on**: `001-mvp-core` (QC), `007` (người thực hiện).

## Bối cảnh & phát hiện

Rà soát phát hiện **bug gốc**: component `Card` (`apps/web/components/ui.tsx`) **không forward `onClick`** → thẻ đơn ở danh sách QC **không bấm được** (đó là lý do "không tương tác được"). Ngoài ra panel QC quá nghèo thông tin so với nghiệp vụ kiểm kim hoàn.

## User Stories *(mandatory)*

### US1 — Card bấm được (P1, bugfix)
`Card` forward `onClick`; thẻ đơn QC chọn được để mở phiếu kiểm.

### US2 — Phiếu kiểm theo bộ tiêu chí (P1)
QC mở 1 đơn → thấy **thông tin sản phẩm đầy đủ** (ảnh, chất liệu, đá, size, xi/màu, yêu cầu KT, **trọng lượng ban đầu→hiện tại + % hao hụt có cảnh báo**) và **bộ tiêu chí kiểm** (trọng lượng, kích thước, gắn đá, xi mạ, đánh bóng, đúc, khớp mẫu, hoàn thiện) — mỗi tiêu chí chọn **Đạt/Lỗi/Bỏ qua**; tiêu chí nghiêm trọng được đánh dấu.
- **AC**: bấm Đạt khi còn tiêu chí "Lỗi" → cảnh báo xác nhận; kết quả checklist được lưu vào `qc_records.checklist`.

### US3 — 3 kết quả + trả lỗi giàu thông tin (P1)
Nút **Đạt / Cần sửa / Không đạt**. Cần sửa/Không đạt mở form: loại lỗi (gợi ý theo tiêu chí lỗi), mức độ, công đoạn trả về, thợ sửa, deadline, **ảnh lỗi**, ghi chú.

### US4 — Kiểm theo từng sản phẩm (P2)
Đơn nhiều SP → chọn từng SP để kiểm; bản ghi QC gắn `orderItemId`.

### US5 — Lịch sử kiểm + thống kê (P2)
Panel hiển thị **lịch sử các lần kiểm** (kết quả, lỗi, #tiêu chí lỗi, người kiểm, ảnh). Thanh **thống kê**: đơn chờ QC, đã kiểm hôm nay, đạt hôm nay, tỷ lệ đạt (`GET /qc/stats`).

## Requirements
- **FR-001**: `Card` MUST forward `onClick` (bugfix).
- **FR-002**: `qc_records` MUST có `checklist` (JSON string) lưu kết quả bộ tiêu chí.
- **FR-003**: `GET /qc/stats` trả pending/passedToday/failedToday/passRateToday (cho vai trò QC).
- **FR-004**: pass/fail nhận `checklist` (JSON string) + `orderItemId`; lưu nguyên.
- **FR-005**: UI phiếu kiểm: thông tin SP + hao hụt cảnh báo + checklist + 3 kết quả + ảnh lỗi + lịch sử.

## Success Criteria
- **SC-001**: Thẻ đơn QC bấm chọn được; panel mở.
- **SC-002**: Checklist lưu đúng (có tiêu chí "lỗi") + đọc lại được ở lịch sử.
- **SC-003**: QC theo SP gắn đúng `orderItemId`; đơn về NEEDS_REWORK khi Cần sửa/Không đạt.

## Notes
- `checklist` truyền dạng **JSON string** để tránh `ValidationPipe(whitelist)` strip mảng-đối-tượng.
- Ngoài phạm vi: loại bỏ/phế (QC_FAILED không rework), AQL/sampling, checklist cấu hình theo loại SP.
