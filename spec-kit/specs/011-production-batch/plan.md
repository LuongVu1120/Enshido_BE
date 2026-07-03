# Implementation Plan: Phase 011 — Lô sản xuất

**Spec**: `./spec.md` · **Branch**: `011-production-batch`
**Hiến pháp liên quan**: I (RBAC), II (audit), III (toàn vẹn hao hụt), VII (realtime).

## 1. Quyết định (chốt với người dùng 2026-07-01)
- **Phân bổ hao hụt**: theo **tỉ lệ khối lượng** + cho **sửa tay** đơn cá biệt.
- **Công đoạn batch**: **Đúc + Xi mạ**, **cấu hình thêm được** (lưu `settings.batchableSteps`).
- **Gom lô**: **quét QR** từng đơn **và** **chọn từ danh sách** đơn đang chờ.

## 2. Công thức phân bổ (bảo toàn khối lượng)
```
W_in = Σ inputᵢ      L = W_in − totalOut      (L âm = tăng cân, vd xi mạ)
override: giữ nguyên lossᵢ nhập tay
auto:     lossᵢ = (L − Σoverride) × inputᵢ / Σinput(auto)
Bảo toàn: dồn phần dư làm tròn (L − Σloss) vào đơn auto có input lớn nhất
outputᵢ = inputᵢ − lossᵢ
```
→ đặt trong `@enshido/types` (`allocateBatchLoss`) để **FE xem trước = BE chốt** cùng 1 hàm.

## 3. Data model (thay đổi nhỏ, tái dùng field sẵn có)
- **`ProductionBatch`**: code `LSX-…`, stepName, status, performedById, totalInput/Output/Loss, allowedLossPercent, note, closedAt.
- **`ProductionStep.batchId`** (nullable) + index → thành viên lô = step cùng batchId. Tái dùng `inputWeight/outputWeight/lossWeight` của step; khi chốt tạo `WeightLog` per-đơn.
- Migration cộng dồn (SQLite).

## 4. API (`production/batches` — trong ProductionModule)
| Endpoint | Vai trò | Ghi chú |
|---|---|---|
| `GET /production/batches/config` · `PUT` | xem: Thợ/QL · sửa: QL | batchableSteps (settings) |
| `GET /production/batches/candidates?stepName=` | Thợ/QL | đơn có công đoạn hiện tại = stepName, chưa vào lô |
| `GET /production/batches` · `POST` · `GET /:id` | Thợ/QL | list / tạo / chi tiết (kèm members + KL vào) |
| `POST /:id/add` · `POST /:id/remove` | Thợ/QL | gom bằng qrToken/orderId/stepId |
| `POST /:id/close` | Thợ/QL | cân tổng → `allocateBatchLoss` → `WeightService.create` mỗi đơn → step DONE + `finalizeBatchStepCompletion` |
| `POST /:id/cancel` | Thợ/QL | bỏ gán members |

- Tái dùng `WeightService.create` (weight_log bất biến + cập nhật item/step + cảnh báo) và `ProductionService.finalizeBatchStepCompletion` (audit + đẩy trạng thái đơn + advance công đoạn kế). `confirmNegative:true` khi chốt (chủ đích, hỗ trợ tăng cân xi mạ).
- `codes.nextBatchCode()` sinh `LSX-YYYYMMDD-####`.

## 5. Web
- **`/batches`**: 2 cột — danh sách lô (lọc trạng thái) | chi tiết lô. Chi tiết: bảng thành viên (KL vào + **xem trước hao hụt** bằng `allocateBatchLoss` client), ô "sửa tay" mỗi đơn, form **Chốt lô** (tổng KL ra → hao hụt lô). Thêm đơn: **danh sách candidates** + **Quét QR** (`QrScanner`).
- Nav "🔥 Lô sản xuất" (Thợ/QL/Admin). Chi tiết đơn: badge "🔥 Lô LSX-…" trên công đoạn thuộc lô.

## 6. Kiểm thử & seed
- Seed: 2 đơn ở công đoạn Đúc + 1 lô Đúc OPEN (demo).
- Selftest nhóm 45: config, lô mở seed, chốt (override + auto) → bảo toàn KL, output=input−loss, weight_log kèm mã lô, step DONE gắn lô, candidates, validate sai công đoạn → 400, RBAC thợ.

## 7. Complexity Tracking
- Không thêm hạ tầng. Tái dùng tối đa (WeightService, ProductionService). Rủi ro chính = đúng toán phân bổ + bảo toàn → khu trú ở 1 hàm thuần có test.

## 8. Thứ tự
types → schema+migration → codes → batches.service/controller/module + hook ProductionService → web (/batches + nav + badge) → seed → selftest/verify/screenshot → docs.
