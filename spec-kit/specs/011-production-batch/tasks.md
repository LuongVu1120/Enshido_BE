# Tasks: Phase 011 — Lô sản xuất (Đúc / Xi mạ theo mẻ)

**Branch**: `011-production-batch` | **Spec**: `./spec.md` | **Plan**: `./plan.md`
**Depends on**: 001, 007.

## Backend
- [x] T1101 [TYPES] `BatchStatus` + nhãn · `BATCHABLE_STEPS_DEFAULT` · `allocateBatchLoss()` (tỉ lệ KL + override + bảo toàn) · `CODE_PREFIX.BATCH`. *(FR-003)*
- [x] T1102 [DB] Prisma `ProductionBatch` + `ProductionStep.batchId` + quan hệ + index; migration. *(FR-001)*
- [x] T1103 [API] `codes.nextBatchCode()` (`LSX-YYYYMMDD-####`). *(FR-001)*
- [x] T1104 [API] DTO: Create/Add/Remove/Override/Close batch. 
- [x] T1105 [API] `BatchesService`: config(get/set), list, detail(+KL vào), create, candidates, add/remove, **close** (phân bổ + WeightService.create + finalize), cancel. *(FR-002..006)*
- [x] T1106 [API] `ProductionService.finalizeBatchStepCompletion()` + `currentStepOfOrder()` (public hook tái dùng). *(FR-004)*
- [x] T1107 [API] `BatchesController` (routes tĩnh trước `:id`) + đăng ký module; RBAC Thợ/QL/Admin. *(FR-007)*
- [x] T1108 [API] `orders.detail` include `batch` cho step (badge). 

## Frontend
- [x] T1109 [WEB] `/batches`: danh sách + tạo lô + chi tiết (thành viên, xem trước phân bổ, sửa tay, chốt lô); thêm đơn qua candidates + QrScanner. *(US1-4)*
- [x] T1110 [WEB] Nav "🔥 Lô sản xuất" (Thợ/QL/Admin); badge "🔥 Lô" trên công đoạn ở chi tiết đơn. 

## Addendum 011b — Kanban theo công đoạn
- [x] T1115 [API] `GET /production/board/by-step` — cột = 9 công đoạn, đơn ở công đoạn hiện tại + tiến độ + cờ trong lô. *(US6)*
- [x] T1116 [WEB] Kanban: nút chuyển "Theo trạng thái đơn ↔ Theo công đoạn"; bảng công đoạn kéo sang cột kế = hoàn thành công đoạn (`PUT /production/steps/:id`). *(US6)*

## Dữ liệu & kiểm thử
- [x] T1111 [SEED] 2 đơn ở công đoạn Đúc + 1 lô Đúc OPEN (demo); dọn `productionBatch` khi reset. *(SC-001)*
- [x] T1112 [TEST] selftest nhóm 45: config, chốt lô (override+auto) bảo toàn KL, output=input−loss, weight_log kèm mã lô, step DONE gắn lô, candidates, validate sai công đoạn 400, RBAC. *(SC-002,003)*
- [x] T1113 [VERIFY] build types/api/web · migrate · seed · selftest 194/194 · unit 6/6 · screenshot. *(SC-004)*
- [x] T1114 [DOCS] ROADMAP/README/REPORT + memory.

## Map US → Tasks
| US | Tasks |
|---|---|
| US1 Gom lô | T1102, T1105, T1107, T1109, T1110 |
| US2 Cân tổng | T1105, T1109 |
| US3 Phân bổ + sửa tay | T1101, T1105, T1109 |
| US4 Chốt = hoàn thành | T1104, T1105, T1106 |
| US5 Cấu hình công đoạn | T1105, T1107 |
| Verify/Docs | T1111, T1112, T1113, T1114 |
