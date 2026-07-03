# Feature Specification: Lô sản xuất (Đúc / Xi mạ theo mẻ)

**Feature Branch**: `011-production-batch`
**Created**: 2026-07-01
**Status**: Done
**Depends on**: `001-mvp-core` (công đoạn + trọng lượng), `007` (người thực hiện).

## Bối cảnh

Một số công đoạn (Đúc, Xi mạ) **làm theo lô nhiều đơn một lúc**, không phải từng cái. Thợ gom ~10 đơn để đúc/xi chung; khi cân chênh lệch khối lượng thì **cân tổng cho cả lô**, không cân từng cái. Nhưng báo cáo hao hụt / giá vốn / KPI vẫn phải đúng **theo từng đơn** (Hiến pháp III — toàn vẹn hao hụt).

**Giải pháp cốt lõi**: cân tổng theo lô → **tự phân bổ chênh lệch về từng đơn theo tỉ lệ khối lượng** (cho phép sửa tay đơn cá biệt) → ghi một `WeightLog` bất biến cho mỗi đơn. Thao tác nhanh (1 lần nhập/lô) mà dữ liệu từng đơn vẫn chuẩn.

## User Stories *(mandatory)*

### US1 — Tạo lô & gom đơn (P1)
Thợ tạo một **lô** cho công đoạn Đúc/Xi mạ, rồi **gom đơn** vào lô bằng **quét QR từng đơn** hoặc **chọn từ danh sách** đơn đang chờ công đoạn đó.
- **AC**: chỉ gom được đơn mà công đoạn HIỆN TẠI đúng bằng công đoạn của lô; một công đoạn chỉ thuộc 1 lô.

### US2 — Cân tổng cả lô (P1)
Xử lý xong, thợ **cân tổng cả lô** và nhập **1 con số** (tổng KL ra). Hệ thống biết tổng KL vào = Σ KL hiện tại của các đơn.
- **AC**: hao hụt lô = tổng vào − tổng ra; hỗ trợ **tăng cân** (xi mạ) → hao hụt âm.

### US3 — Phân bổ về từng đơn theo tỉ lệ KL + sửa tay (P1)
Chênh lệch được **chia về từng đơn theo tỉ lệ khối lượng**; cho phép **sửa tay** hao hụt của vài đơn cá biệt, phần còn lại tự chia.
- **AC** (bảo toàn khối lượng): `Σ hao hụt phân bổ === hao hụt lô` (phần dư làm tròn dồn vào đơn KL lớn nhất). Mỗi đơn ghi 1 `WeightLog` bất biến; cảnh báo vượt định mức tính **riêng từng đơn**.

### US4 — Chốt lô = hoàn thành công đoạn cho tất cả (P1)
Chốt lô → đánh dấu công đoạn Đúc/Xi mạ **Hoàn thành** cho mọi đơn, **tín công** cho người chạy lô (`performedById` — Phase 007), đơn đi tiếp công đoạn sau (đúng luồng per-đơn: QC, rework…).

### US5 — Công đoạn chạy theo lô cấu hình được (P2)
Mặc định **Đúc + Xi mạ**; admin/QL đổi được danh sách công đoạn batch (lưu ở `settings`).

## Requirements *(mandatory)*
- **FR-001**: Bảng `ProductionBatch` (mã `LSX-YYYYMMDD-####`, công đoạn, trạng thái OPEN/DONE/CANCELLED, tổng vào/ra/hao hụt, người chạy). `ProductionStep.batchId` gán step vào lô.
- **FR-002**: Gom thành viên bằng qrToken / orderId / stepId; validate công đoạn khớp + là công đoạn hiện tại + chưa thuộc lô khác.
- **FR-003**: Hàm dùng chung `allocateBatchLoss()` chia hao hụt theo tỉ lệ KL (+ override), **bảo toàn khối lượng**. Dùng cho cả server (chốt) và client (xem trước).
- **FR-004**: Chốt lô tái dùng `WeightService.create` → mỗi đơn 1 `WeightLog` bất biến (hao hụt/lũy kế/cảnh báo per-đơn) + hoàn thành step + `performedById` + đẩy trạng thái đơn.
- **FR-005**: `GET /production/batches/candidates?stepName=` liệt kê đơn đang chờ công đoạn đó (cho "chọn danh sách").
- **FR-006**: Công đoạn batch cấu hình ở `settings.batchableSteps` (mặc định CASTING, PLATING).
- **FR-007**: RBAC — Thợ + Quản lý sản xuất (+ Admin) vận hành lô.

## Success Criteria *(mandatory)*
- **SC-001**: Gom ≥2 đơn cùng công đoạn vào 1 lô; đơn sai công đoạn bị từ chối.
- **SC-002**: Chốt lô với tổng KL ra → `Σ hao hụt phân bổ = hao hụt lô` (bảo toàn); đơn override nhận đúng số nhập tay.
- **SC-003**: Sau chốt, mỗi đơn có `WeightLog` (stageName kèm mã lô), công đoạn DONE gắn mã lô, đơn đi tiếp công đoạn sau.
- **SC-004**: `npm run selftest` xanh (nhóm 45); `npm test` 6/6.

### US6 — Kanban theo công đoạn (P2, addendum 011b)
Ngoài bảng Kanban **theo trạng thái đơn** (Phase 006), thêm **chế độ xem "theo công đoạn"** (nút chuyển): cột = 9 công đoạn quy trình, mỗi đơn nằm ở **công đoạn hiện tại**; thẻ hiển thị tiến độ X/9 + cờ "🔥 trong lô". **Kéo thẻ sang công đoạn kế tiếp = đánh dấu công đoạn hiện tại hoàn thành** (thao tác nhanh của quản lý; cập nhật cân/QC vẫn qua luồng quét QR của thợ).
- **AC**: chỉ kéo được sang cột kế tiếp; giữ nguyên bảng theo trạng thái đơn.

## Out of scope
- Batch cho các công đoạn khác ngoài cấu hình; QC theo lô; batch QR riêng in phiếu lô.
- Phân bổ theo diện tích mạ (xi) — hiện chỉ theo khối lượng (+ sửa tay).
