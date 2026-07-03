# Tasks: Phase 013 — QR full-link · Gom lô khi quét · KL tiếp nhận

**Branch**: `013-qr-scan-enhancements` | **Spec**: `./spec.md` | **Plan**: `./plan.md`
**Depends on**: 001, 011, 012.

## A. QR full-link
- [x] T1301 [API] `common/network.util.ts` `getPublicWebOrigin()` (IP LAN + PUBLIC_WEB_ORIGIN override). *(FR-001)*
- [x] T1302 [API] `tickets.service` dùng helper cho scanUrl/QR. *(FR-001)*
- [x] T1303 [WEB] `ticket-modal` hiển thị URL đích dưới QR. *(FR-002)*
- [x] T1304 [CFG] `.env.example` thêm `PUBLIC_WEB_ORIGIN`. *(FR-006)*

## B. Gom lô khi quét
- [x] T1305 [WEB] `qr-scanner` prop `continuous` (chống lặp ~2s). *(FR-003)*
- [x] T1306 [WEB] `/scan` chế độ **Gom lô**: tự tạo lô theo công đoạn đơn đầu + gom tiếp + danh sách + link `/batches`. *(FR-004, US2)*

## C. KL tiếp nhận khi quét
- [x] T1307 [API] `StepTargetDto.receivedWeight?`+`orderItemId?`; `production.accept` ghi weight_log "Tiếp nhận – <công đoạn>". *(FR-005, US3)*
- [x] T1308 [WEB] `/scan/[token]`: ô KL tiếp nhận (tùy chọn) khi Tiếp nhận. *(US3)*

## D. Kiểm thử & tài liệu
- [x] T1309 [TEST] selftest: scanUrl http+/scan/; accept receivedWeight → weight_log "Tiếp nhận" + TL hiện tại; gom lô qua qrToken. *(SC-001..003)*
- [x] T1310 [VERIFY] build · seed · selftest xanh · unit 6/6 · screenshot.
- [x] T1311 [DOCS] ROADMAP/README/REPORT + memory.

## Map US → Tasks
| US | Tasks |
|---|---|
| US1 QR full-link | T1301, T1302, T1303, T1304 |
| US2 Gom lô | T1305, T1306 |
| US3 KL tiếp nhận | T1307, T1308 |
| Verify/Docs | T1309, T1310, T1311 |
