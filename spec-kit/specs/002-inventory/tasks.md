# Tasks: Inventory (Tồn kho) — ENSHIDO

**Branch**: `002-inventory` | **Spec**: `./spec.md` | **Plan**: `./plan.md`
**Depends on**: 001-mvp-core.

## Phase 0 — Nền (Setup)

- [x] T201 `@enshido/types`: enum `InventoryGroup` (7 nhóm), `InventoryTxnType` (IN/OUT/TRANSFER/FG_IN), `StockStatus` + labels + helper `stockStatusOf()`.
- [x] T202 Prisma: model `Supplier`; mở rộng `InventoryItem` (group, location, maxStock, supplierId) + `InventoryTransaction` (type, supplierId, productionStepId, performedById, fromGroup, toGroup, note); migration.
- [x] T203 Seed: 3 NCC + ~10 vật tư mẫu trải 7 nhóm (vài cái dưới tồn tối thiểu để test cảnh báo).

**Checkpoint 0**: migrate + seed OK.

## Phase 1 — US1 Danh mục vật tư & NCC (P1)

- [x] T210 [API] `inventory` module: items CRUD, sinh `VT-######`, tính `stockStatus`; lọc theo group/supplier/status + tìm + phân trang. *(FR-001)*
- [x] T211 [API] suppliers CRUD, sinh `NCC-######`. *(Key Entities)*
- [x] T212 [WEB] Trang **Tồn kho** (bảng + lọc + badge trạng thái + thẻ tổng giá trị theo nhóm). *(US1)*
- [x] T213 [WEB] Trang **Nhà cung cấp**. 

**Checkpoint 1**: tạo vật tư VT-, lọc nhóm/NCC, thấy trạng thái tồn.

## Phase 2 — US2 Nhập · US3 Xuất · US6 Chuyển (P1/P2)

- [x] T220 [API] `POST /inventory/receipts` (nhập): tồn += qty, tạo txn IN, đính kèm hóa đơn; transactional + audit. *(FR-002)*
- [x] T221 [API] `POST /inventory/issues` (xuất theo đơn/CĐ): chặn âm tồn (400), tồn -= qty, txn OUT gắn order/step/người. *(FR-003, SC-002)*
- [x] T222 [API] `POST /inventory/transfers` (chuyển nhóm kho): txn TRANSFER (fromGroup→toGroup). *(FR-006)*
- [x] T223 [API] `GET /inventory/transactions` (lịch sử immutable, lọc theo item/order/type). *(FR-007)*
- [x] T224 [WEB] Modal **Nhập kho / Xuất kho / Chuyển kho** + tab lịch sử giao dịch. *(US2/US3/US6)*
- [x] T225 [TEST] Tồn đúng sau IN/OUT/TRANSFER; xuất vượt tồn → chặn; txn gắn order_id. *(SC-001/002)*

**Checkpoint 2**: nhập→tồn tăng; xuất cho đơn→tồn giảm + truy ngược; chuyển kho cân đối.

## Phase 3 — US4 Nhập kho thành phẩm sau QC PASS (P1)

- [x] T230 [API] `GET /inventory/finished-goods/pending`: đơn `PRODUCTION_DONE` (đã QC PASS) chờ nhập. *(FR-004, SC-003)*
- [x] T231 [API] `POST /inventory/finished-goods/stock-in`: tạo/тăng vật tư nhóm Thành phẩm (txn FG_IN gắn order), đánh dấu CĐ Nhập kho TP DONE, đơn → `STOCKED`. *(FR-004)*
- [x] T232 [WEB] Trang **Nhập kho thành phẩm** (hàng chờ + nút nhập). *(US4)*
- [x] T233 [TEST] QC PASS → xuất hiện ở pending; stock-in → đơn STOCKED + tồn TP tăng. *(SC-003)*

**Checkpoint 3**: khép kín đơn → QC PASS → nhập kho TP → STOCKED.

## Phase 4 — US5 Cảnh báo · US7 Định giá (P2/P3)

- [x] T240 [API] `GET /inventory/alerts`: vật tư LOW/OUT (≤ tồn tối thiểu). *(FR-005, SC-004)*
- [x] T241 [API] `GET /inventory/valuation` + `GET /inventory/summary`: tổng giá trị tồn theo nhóm/tổng. *(FR-008)*
- [x] T242 [WEB] Khối cảnh báo + donut tổng giá trị theo nhóm (bám mockup tồn kho).
- [x] T243 [TEST] 100% vật tư dưới tối thiểu xuất hiện ở alerts; valuation = Σ(tồn×giá nhập).

**Checkpoint 4 (002 done)**: demo đủ luồng kho + cảnh báo + định giá như mockup.

## Map US → Tasks

| US | Tasks |
|---|---|
| US1 | T210–T213 |
| US2 | T220, T224 |
| US3 | T221, T224, T225 |
| US4 | T230–T233 |
| US5 | T240, T242 |
| US6 | T222, T224 |
| US7 | T241, T242 |
