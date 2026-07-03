# Implementation Plan: Reports & Analytics — ENSHIDO

**Branch**: `003-reports-analytics` | **Date**: 2026-06-10 | **Spec**: `./spec.md`

**Depends on**: `001-mvp-core` (orders/production/qc/weight), `002-inventory` (inventory). Stack chuẩn (ROADMAP).

## Summary

Tổng hợp dữ liệu vận hành thành báo cáo ra quyết định: **đơn hàng, sản xuất, QC, hao hụt, năng suất thợ, tồn kho**; hoàn thiện **dashboard nâng cao** (sản lượng 7 ngày, hoạt động gần đây, cơ cấu tồn kho…); cho **lọc theo khoảng ngày** và **xuất CSV/in PDF**. Tổng hợp trực tiếp từ DB (read-only), không tạo bảng mới (trừ cache tùy chọn).

## Technical Context

Read-only aggregation qua Prisma (`groupBy`, `aggregate`, count) + xử lý ở service. Không thêm dependency bắt buộc. Xuất **CSV** (text/csv, mở được bằng Excel) thay cho ExcelJS để giữ nhẹ; **PDF** qua in trình duyệt (`window.print`) như phiếu sản xuất. Báo cáo nặng có thể cache (Redis) ở prod — MVP tính trực tiếp.

## Constitution Check

| Nguyên tắc | Tuân thủ |
|---|---|
| I. RBAC | Báo cáo chỉ cho Admin/Quản lý/Kế toán (`@Roles`) — dữ liệu nhạy cảm |
| II. Audit | Read-only, không mutation → không phát sinh log |
| III. Hao hụt | Báo cáo hao hụt dùng đúng số liệu `weight_logs` bất biến |
| VII. Performance | Aggregate có index; báo cáo nặng cache/chạy nền (prod) |

→ **PASS**. Không vi phạm.

## API Contracts (tài liệu mục 6.9 — `/reports/...`)

- `GET /reports/orders?from&to` — đơn theo trạng thái/khách/kênh, đơn trễ, thời gian xử lý TB.
- `GET /reports/production?from&to` — sản lượng/ngày, theo công đoạn, công đoạn tắc, thời gian TB/công đoạn.
- `GET /reports/qc?from&to` — pass/fail rate; lỗi theo công đoạn/thợ/loại lỗi; số lần làm lại.
- `GET /reports/loss?from&to` — tổng vào/ra/hao hụt; tỷ lệ TB; theo công đoạn/thợ/loại SP; danh sách vượt định mức.
- `GET /reports/productivity?from&to` — theo thợ: hoàn thành, đúng hạn, tỷ lệ lỗi, xếp hạng.
- `GET /reports/inventory` — tồn theo nhóm, sắp hết, vật tư tiêu hao nhiều nhất, giá trị tồn.
- `GET /reports/{kind}/export.csv?from&to` — xuất CSV theo bộ lọc (FR-007).
- `GET /dashboard/advanced?from&to` — sản lượng 7 ngày, hoạt động gần đây, top thợ, cơ cấu tồn kho, xu hướng hao hụt (US6).

## Phasing (tasks)

1. Reports module + endpoints orders/production/qc/loss. *(US1/US2/US3 — P1)*
2. Productivity + inventory report. *(US4/US5 — P2)*
3. Dashboard advanced + web Reports page (charts/tables/filter). *(US6)*
4. CSV export + print. *(US7 — P3)*
5. Selftest + verify.

## Complexity Tracking

Kế thừa dev accommodations 001/002. Xuất **CSV thay ExcelJS** và **PDF qua print** là điều chỉnh nhẹ (FR-007 là SHOULD) — ghi nhận tại đây; lên prod có thể thêm ExcelJS/Puppeteer.
