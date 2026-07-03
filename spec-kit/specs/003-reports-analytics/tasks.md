# Tasks: Reports & Analytics — ENSHIDO

**Branch**: `003-reports-analytics` | **Spec**: `./spec.md` | **Plan**: `./plan.md`
**Depends on**: 001-mvp-core, 002-inventory.

## Phase 1 — Báo cáo cốt lõi (P1)

- [x] T301 [API] `reports` module + helper khoảng ngày (from/to) + xuất CSV chung.
- [x] T302 [API] `GET /reports/orders`: tổng theo trạng thái/khách/kênh, đơn trễ, thời gian xử lý TB. *(FR-001, US1)*
- [x] T303 [API] `GET /reports/production`: sản lượng/ngày, theo công đoạn, công đoạn tắc, thời gian TB/công đoạn. *(FR-002, US1)*
- [x] T304 [API] `GET /reports/qc`: pass/fail rate; lỗi theo công đoạn/thợ/loại lỗi; số lần làm lại. *(FR-003, US2)*
- [x] T305 [API] `GET /reports/loss`: tổng vào/ra/hao hụt; tỷ lệ TB; theo công đoạn/thợ/loại SP; vượt định mức. *(FR-004, US3)*

**Checkpoint 1**: 4 báo cáo P1 trả số khớp dữ liệu nguồn.

## Phase 2 — Năng suất & Tồn kho (P2)

- [x] T310 [API] `GET /reports/productivity`: theo thợ (hoàn thành, đúng hạn, tỷ lệ lỗi, xếp hạng). *(FR-005, US4)*
- [x] T311 [API] `GET /reports/inventory`: tồn theo nhóm, sắp hết, vật tư tiêu hao nhiều nhất, giá trị tồn. *(FR-005, US5)*

## Phase 3 — Dashboard nâng cao + Web (P2)

- [x] T320 [API] `GET /dashboard/advanced`: sản lượng 7 ngày, hoạt động gần đây, top thợ, cơ cấu tồn kho, xu hướng hao hụt. *(FR-006, US6)*
- [x] T321 [WEB] Trang **Báo cáo** `/reports`: bộ lọc khoảng ngày + tabs (Đơn/Sản xuất/QC/Hao hụt/Năng suất/Tồn kho), Recharts + bảng. *(US1–US5)*
- [x] T322 [WEB] Hoàn thiện **Dashboard**: thêm biểu đồ sản lượng 7 ngày + hoạt động gần đây + cơ cấu tồn kho. *(US6)*
- [x] T323 [WEB] Thêm "Báo cáo" vào nav (Admin/Quản lý/Kế toán).

## Phase 4 — Xuất file (P3)

- [x] T330 [API] `GET /reports/{kind}/export.csv`: xuất CSV theo bộ lọc. *(FR-007, US7)*
- [x] T331 [WEB] Nút **Xuất CSV** + **In** (PDF qua trình duyệt) trên trang báo cáo. *(US7)*

## Phase 5 — Kiểm thử

- [x] T340 [TEST] Selftest: aggregates khớp nguồn (qc rate, loss totals, đơn trễ, productivity); export CSV trả về. *(SC-001/003)*

## Map US → Tasks

| US | Tasks |
|---|---|
| US1 | T302, T303, T321 |
| US2 | T304, T321 |
| US3 | T305, T321 |
| US4 | T310, T321 |
| US5 | T311, T321 |
| US6 | T320, T322 |
| US7 | T330, T331 |
