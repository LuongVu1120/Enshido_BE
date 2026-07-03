# Implementation Plan: Phase 013 — QR full-link · Gom lô khi quét · KL tiếp nhận

**Spec**: `./spec.md` · **Branch**: `013-qr-scan-enhancements`
**Hiến pháp**: IV (mobile-first thợ), III (weight_logs append-only), VI (QR token, security).

## 1. Quyết định (chốt 2026-07-02)
- QR host dev: **tự dò IP LAN** (`os`), `PUBLIC_WEB_ORIGIN` override.
- Gom lô mobile: **tự tạo lô theo công đoạn của đơn đầu quét** (tái dùng API Phase 011).
- KL tiếp nhận: **ghi 1 bản cân "Tiếp nhận – <công đoạn>"**.
- **Không migration.**

## 2. Backend
| Vùng | Thay đổi |
|---|---|
| `common/network.util.ts` *(mới)* | `getPublicWebOrigin(config)`: `PUBLIC_WEB_ORIGIN` → nếu `WEB_ORIGIN` host là localhost/127.0.0.1 thay bằng IPv4 LAN (`os.networkInterfaces`, non-internal), giữ port. |
| `tickets.service` | dùng `getPublicWebOrigin` cho `scanUrl` + QR. |
| `production/dto.ts` | `StepTargetDto`: `receivedWeight?: number`, `orderItemId?: string`. |
| `production.service.accept` | sau khi ACCEPTED, nếu `receivedWeight != null` → `weight.create(order.id, { orderItemId: dto.orderItemId ?? item[0], stageName: 'Tiếp nhận – <label>', previousWeight: item.currentWeight ?? initial, currentWeight: receivedWeight, confirmNegative: true })` (productionStepId **để trống** → dòng riêng ở bảng theo dõi). |
| `.env.example` | thêm `# PUBLIC_WEB_ORIGIN="http://<domain-hoặc-ip>:3000"`. |

RBAC/khoá: không đổi. Batch gom dùng endpoint sẵn có (`/production/batches` + `/:id/add`), vai trò Thợ đã cho phép (Phase 011).

## 3. Web
| File | Thay đổi |
|---|---|
| `components/qr-scanner.tsx` | thêm prop `continuous?: boolean` — không stop sau lần đầu; chống lặp cùng 1 mã trong ~2s (ref + timestamp truyền qua args). |
| `components/ticket-modal.tsx` | hiển thị `ticket.scanUrl` (text/link) dưới QR + gợi ý "quét mở web đích". |
| `app/(app)/scan/page.tsx` | 2 chế độ: **Mở đơn** (như cũ) và **Gom lô**. Gom lô: `QrScanner continuous`; đơn đầu → `GET /scan/:token` lấy `currentStep.stepName` → `POST /production/batches {stepName}` (lỗi nếu không batchable) → `/:id/add {qrToken}`; đơn sau `/:id/add`; hiển thị danh sách gom + nút "Mở lô để chốt" (`/batches`). Thông báo lỗi từng lần quét (sai công đoạn/đã trong lô). |
| `app/scan/[token]/page.tsx` | ô **KL tiếp nhận (g) — tùy chọn** ở khu Tiếp nhận; `accept` gửi `{ stepId, expectedVersion, orderItemId, receivedWeight }`. |

## 4. Kiểm thử (`selftest.mjs`)
- Ticket: `POST /orders/:id/print-production-ticket` → `scanUrl` bắt đầu `http`, chứa `/scan/`.
- Accept + receivedWeight: tạo đơn + configure-steps → `POST /scan/:token/accept { receivedWeight }` → có weight_log stage chứa "Tiếp nhận"; TL hiện tại SP = KL nhập.
- Gom lô: `GET /scan/:token` (đơn Đúc) → `POST /production/batches {CASTING}` → `/:id/add {qrToken}` đơn 2 → lô 2 đơn (tái dùng nhóm 45).
- Unit hao hụt 6/6.

## 5. Complexity / rủi ro
- IP LAN dò ở server: chọn IPv4 non-internal đầu tiên; nếu máy nhiều NIC có thể chọn nhầm → cho `PUBLIC_WEB_ORIGIN` override (đã có).
- `continuous` scan: chống lặp bằng debounce theo giá trị; add trùng đơn → server trả 400 "đã thuộc lô", client bỏ qua.

## 6. Thứ tự
network.util + tickets + ticket-modal + .env → dto + accept(receivedWeight) + scan token UI → qr-scanner continuous + scan gather UI → selftest/verify/screenshot → docs.
