# Implementation Plan: Inventory (Tồn kho) — ENSHIDO

**Branch**: `002-inventory` | **Date**: 2026-06-10 | **Spec**: `./spec.md`

**Depends on**: `001-mvp-core` (orders, production_steps, QC pass). Kế thừa **stack chuẩn** ở `ROADMAP.md`.

## Summary

Hoàn thiện nghiệp vụ kho: danh mục vật tư theo 7 nhóm kho + nhà cung cấp; nhập/xuất/chuyển kho với cập nhật tồn **trong transaction** (không âm tồn); nhập kho thành phẩm tự động sau **QC PASS** (nối 001 → đổi trạng thái đơn sang "Đã nhập kho TP"); cảnh báo tồn tối thiểu; định giá tồn theo nhóm. Mọi giao dịch lưu **immutable** kèm người thực hiện.

## Technical Context

Mở rộng module trên nền NestJS + Prisma sẵn có. Không thêm dependency mới. Tồn kho ghi qua `prisma.$transaction` để đảm bảo tính nhất quán (SC-001).

## Constitution Check

| Nguyên tắc | Cách tuân thủ |
|---|---|
| I. RBAC | Nghiệp vụ kho giới hạn vai trò **Kho** (+ Admin/Quản lý xem); kế toán xem định giá |
| II. Audit immutable | `inventory_transactions` append-only (chỉ create) + ghi `activity_logs` cho mỗi nhập/xuất/chuyển |
| III. Weight/Loss | Không đụng (logic cân ở 001) |
| VI. Security | Đính kèm hóa đơn dùng `attachments` (kiểm soát loại/dung lượng từ 001) |
| VII. Performance | Danh sách tồn phân trang + index; cảnh báo tính bằng query |

→ **PASS**. Không vi phạm.

## Data Model (mở rộng 001)

| Bảng | Thay đổi | Trường chính |
|---|---|---|
| `suppliers` *(mới)* | NCC | `code` (NCC-######), name, phone, address, note |
| `inventory_items` | mở rộng | + `group` (7 nhóm kho), `location`, `maxStock`, `supplierId` |
| `inventory_transactions` | mở rộng | + `type` (IN/OUT/TRANSFER/FG_IN), `supplierId`, `productionStepId`, `performedById`, `fromGroup`, `toGroup`, `note` |

**7 nhóm kho** (enum `InventoryGroup` ở `@enshido/types`): nguyên liệu, đá/đá tấm, phụ kiện, hóa chất xi/mạ, bao bì, bán thành phẩm, thành phẩm.

**Trạng thái tồn** (tính): `NORMAL` (> minStock), `LOW` (0 < tồn ≤ minStock), `OUT` (= 0).

## API Contracts (theo tài liệu mục 6.8)

- **Items**: `GET/POST /inventory/items`, `GET/PUT /inventory/items/{id}`
- **Suppliers**: `GET/POST /inventory/suppliers`
- **Giao dịch**: `POST /inventory/receipts` (nhập), `POST /inventory/issues` (xuất theo đơn/CĐ), `POST /inventory/transfers` (chuyển), `GET /inventory/transactions`
- **Thành phẩm**: `GET /inventory/finished-goods/pending` (đơn QC PASS chờ nhập), `POST /inventory/finished-goods/stock-in` (nhập kho TP → đơn `STOCKED`)
- **Cảnh báo & định giá**: `GET /inventory/alerts`, `GET /inventory/valuation`, `GET /inventory/summary`

## Phasing (gợi ý cho tasks)

1. Types + schema + migration + seed (NCC + vật tư mẫu). *(nền)*
2. Items + Suppliers CRUD. *(US1)*
3. Nhập / Xuất (gắn đơn+CĐ, chặn âm tồn) / Chuyển — transactional + audit. *(US2/US3/US6)*
4. Nhập kho TP sau QC PASS → đơn `STOCKED`. *(US4)*
5. Cảnh báo tồn tối thiểu + định giá + summary. *(US5/US7)*
6. Web pages + nav + selftest.

## Complexity Tracking

Kế thừa dev accommodations của 001 (SQLite/disk). Không phát sinh vi phạm mới.
