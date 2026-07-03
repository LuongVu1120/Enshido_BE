# Feature Specification: QR full-link · Gom lô khi quét · KL tiếp nhận

**Feature Branch**: `013-qr-scan-enhancements`
**Created**: 2026-07-02
**Status**: Done
**Depends on**: `001-mvp-core` (QR/scan), `011-production-batch` (lô), `012` (trọng lượng).

## Bối cảnh (rà soát)
- QR phiếu đã mã hóa `${WEB_ORIGIN}/scan/<token>` nhưng `WEB_ORIGIN=localhost:3000` → **điện thoại/app ngoài không quét mở được**; ticket-modal cũng chưa hiển thị URL đích.
- Trang quét của thợ chỉ mở **1 đơn/lần**; chưa gom nhiều đơn (giống Lô sản xuất).
- Quét xong chưa nhập được **KL tiếp nhận** ngay.

## User Stories *(mandatory)*

### US1 — QR full-link quét được từ ngoài (P1)
QR trên phiếu chứa **URL đầy đủ dùng IP LAN** (dev) để quét mở từ camera điện thoại/app bất kỳ; **hiển thị URL đích** dạng text dưới QR (bấm/nhập được).
- **AC**: `scanUrl` bắt đầu `http://`, host là IP LAN (khi WEB_ORIGIN=localhost) hoặc `PUBLIC_WEB_ORIGIN` nếu đặt; ticket-modal hiển thị URL.

### US2 — Gom đơn thành lô khi quét (P1)
Ở trang quét, chế độ **"Gom lô"**: quét **liên tục nhiều QR**. Quét đơn đầu → hệ thống lấy **công đoạn hiện tại** của đơn (nếu là công đoạn chạy lô: Đúc/Xi mạ) → **tự tạo lô** & gom; các QR sau gom tiếp vào lô đó. Đơn sai công đoạn → cảnh báo, bỏ qua.
- **AC**: quét ≥2 QR → 1 lô với ≥2 đơn; điều hướng sang trang Lô để chốt. Tái dùng API Phase 011.

### US3 — Cập nhật KL tiếp nhận khi quét (P1, tùy chọn)
Khi **Tiếp nhận** công đoạn, thợ có thể nhập **KL tiếp nhận (g)** (tùy chọn) → ghi **1 bản cân "Tiếp nhận – <công đoạn>"** (TL trước = TL hiện tại, TL sau = KL nhập), cập nhật TL hiện tại của SP.
- **AC**: accept kèm receivedWeight → có bản cân "Tiếp nhận…" + TL hiện tại đổi theo; không nhập thì accept như cũ.

## Requirements *(mandatory)*
- **FR-001**: Helper `getPublicWebOrigin()` — ưu tiên `PUBLIC_WEB_ORIGIN`; nếu `WEB_ORIGIN` là localhost/127.0.0.1 thì thay host bằng **IP LAN** (`os.networkInterfaces`), giữ port. `tickets.printTicket` dùng helper cho `scanUrl`/QR.
- **FR-002**: Ticket-modal hiển thị **URL đích** (text) dưới QR.
- **FR-003**: `QrScanner` hỗ trợ `continuous` (quét liên tục, chống lặp 1 mã trong ~2s).
- **FR-004**: Trang `/scan` có chế độ **Gom lô**: tự tạo lô theo công đoạn đơn đầu (`GET /scan/:token` lấy `currentStep` + `POST /production/batches` + `/:id/add {qrToken}`); hiển thị danh sách đã gom + link tới `/batches`.
- **FR-005**: `StepTargetDto.receivedWeight?` + `orderItemId?`; `production.accept` nếu có receivedWeight → tạo weight_log "Tiếp nhận – <công đoạn>" (productionStepId để trống để thành dòng riêng), `measuredBy` = người quét, `confirmNegative=true`.
- **FR-006**: `.env.example` thêm `PUBLIC_WEB_ORIGIN` (comment hướng dẫn).

## Success Criteria *(mandatory)*
- **SC-001**: `POST /orders/:id/print-production-ticket` trả `scanUrl` http đầy đủ + chứa `/scan/<token>`.
- **SC-002**: Quét 2 QR ở chế độ Gom lô → 1 lô Đúc/Xi mạ có 2 đơn.
- **SC-003**: Accept kèm `receivedWeight` → có weight_log stage chứa "Tiếp nhận"; TL hiện tại SP = KL nhập.
- **SC-004**: `npm run selftest` xanh; `npm test` 6/6.

## Out of scope
- Không đổi schema. Không đổi cơ chế token QR (vẫn token, không nhúng dữ liệu nhạy cảm — HP VI).
- Chốt lô vẫn ở trang `/batches` (mobile chỉ gom + điều hướng).
