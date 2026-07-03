# Implementation Plan: Automation & Integrations — ENSHIDO

**Branch**: `005-automation-integrations` | **Date**: 2026-06-15 | **Spec**: `./spec.md`
**Depends on**: 001–004 (dùng dữ liệu sản xuất, tồn kho, báo cáo, nhân sự). Stack chuẩn.

## Summary

Lớp trên cùng, **rule-based** (luật cấu hình được, chưa ML): cảnh báo nguy cơ trễ đơn, gợi ý phân công thợ (tải + kỹ năng), tính KPI & lương theo sản lượng, tính giá vốn sản phẩm (vật tư + công + hao hụt), và **stub tích hợp** sàn TMĐT/kế toán có nhật ký đồng bộ (idempotent). Mọi ngưỡng/đơn giá lưu ở bảng `settings` (sửa không cần sửa code — FR-006).

## Constitution Check

| Nguyên tắc | Tuân thủ |
|---|---|
| I. RBAC | Tự động hóa: Admin/Quản lý; cấu hình & lương: Admin/Kế toán |
| II. Audit | Đổi cấu hình + chạy đồng bộ ghi `activity_logs` / `integration_logs` |
| III. Hao hụt | Giá vốn dùng đúng số liệu `weight_logs` (hao hụt) |
| VII. Performance | Tính trực tiếp từ DB; có thể cache ở prod |

→ **PASS** (rule-based, không vi phạm).

## Data Model (mở rộng)

| Bảng | Vai trò |
|---|---|
| `settings` *(mới)* | key–value (JSON) cấu hình ngưỡng/đơn giá. FR-006. |
| `integrations` *(mới, P3)* | kết nối ngoài: name, provider, status, config, lastSyncAt |
| `integration_logs` *(mới, P3)* | nhật ký đồng bộ: action, status, message, ref (idempotent key) |

**Tham số cấu hình mặc định** (`@enshido/types` `AUTOMATION_DEFAULTS`): `avgDaysPerStep`, `delayRiskFactor`, `laborCostPerStep`, `metalPricePerGram`, `kpiRatePerStep`, `onTimeBonusRate`, `defectPenaltyPerUnit`.

## Công thức (rule-based)

- **Nguy cơ trễ (US1)**: với đơn đang chạy có deadline → `remainingSteps` (chưa DONE) × `avgDaysPerStep` × `delayRiskFactor` = số ngày cần. Nếu `daysLeft < cần` ⇒ AT_RISK; nếu đã quá hạn ⇒ OVERDUE. Kèm lý do.
- **Gợi ý phân công (US2)**: thợ (role WORKER, đang làm) xếp theo **tải** (số công đoạn đang xử lý/chờ) tăng dần, ưu tiên **khớp kỹ năng** (employee.skills chứa tên công đoạn).
- **KPI & lương theo sản lượng (US3)**: theo thợ/tháng → `completed × kpiRatePerStep`, cộng thưởng đúng hạn (`× onTimeBonusRate`), trừ phạt lỗi (`defect × defectPenaltyPerUnit`). Truy ngược nguồn = báo cáo năng suất 003.
- **Giá vốn (US4)**: `vật tư` (Σ xuất kho cho đơn × đơn giá) + `công` (số công đoạn DONE × laborCostPerStep) + `hao hụt` (gram hao hụt lũy kế × metalPricePerGram). Trả phân rã 3 thành phần + tổng.

## API Contracts (`/automation/...`)

- `GET /automation/delay-risk` — danh sách đơn nguy cơ trễ + lý do. *(FR-001)*
- `GET /automation/assignment-suggestion?stepName=` — xếp hạng thợ phù hợp. *(FR-002)*
- `GET /automation/kpi?month=YYYY-MM` — KPI/lương theo sản lượng từng thợ. *(FR-003)*
- `GET /automation/costing/{orderId}` — giá vốn + phân rã 3 thành phần. *(FR-004)*
- `GET/PUT /automation/settings` — cấu hình ngưỡng/đơn giá (Admin). *(FR-006)*
- `GET /automation/integrations` · `POST /automation/integrations/{id}/sync` · `GET /automation/integrations/{id}/logs` — stub tích hợp + log idempotent. *(FR-005, P3)*

## Phasing (tasks)

1. `settings` + `integrations`/`integration_logs` model + migration + seed; types `AUTOMATION_DEFAULTS`.
2. delay-risk + assignment-suggestion. *(US1/US2)*
3. kpi/salary + costing. *(US3/US4)*
4. settings GET/PUT (config-driven) + integration stub/sync. *(FR-006, US5)*
5. Web Automation page + nav + selftest.

## Complexity Tracking

Tích hợp sàn/kế toán (US5/P3) làm **stub** (mock + log idempotent) — phạm vi thật cần `/speckit.clarify` chốt sàn nào (ghi nhận tại đây). KPI/lương dùng đơn giá cấu hình thay cho payroll đầy đủ (004 P2 chưa làm).
