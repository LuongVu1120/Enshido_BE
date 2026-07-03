# Tasks: Automation & Integrations — ENSHIDO

**Branch**: `005-automation-integrations` | **Spec**: `./spec.md` | **Plan**: `./plan.md`
**Depends on**: 001–004.

## Phase 0 — Nền

- [x] T501 `@enshido/types`: `AUTOMATION_DEFAULTS` (avgDaysPerStep, delayRiskFactor, laborCostPerStep, metalPricePerGram, kpiRatePerStep, onTimeBonusRate, defectPenaltyPerUnit) + nhãn.
- [x] T502 Prisma: `settings` (key/value), `integrations`, `integration_logs`; migration + seed (cấu hình mặc định + 2 integration mẫu DISCONNECTED).

## Phase 1 — Cảnh báo & Gợi ý (P2 · US1/US2)

- [x] T510 [API] `GET /automation/delay-risk`: đơn nguy cơ trễ/quá hạn + lý do (remainingSteps × avgDaysPerStep × factor vs daysLeft). *(FR-001)*
- [x] T511 [API] `GET /automation/assignment-suggestion?stepName=`: xếp hạng thợ theo tải + khớp kỹ năng. *(FR-002)*

## Phase 2 — KPI/Lương & Giá vốn (P2 · US3/US4)

- [x] T520 [API] `GET /automation/kpi?month=`: completed×rate + thưởng đúng hạn − phạt lỗi; truy ngược 003. *(FR-003)*
- [x] T521 [API] `GET /automation/costing/{orderId}`: vật tư + công + hao hụt → phân rã 3 thành phần + tổng. *(FR-004, SC-003)*

## Phase 3 — Cấu hình & Tích hợp (P2/P3 · US5 · FR-006)

- [x] T530 [API] `GET/PUT /automation/settings`: đọc/ghi ngưỡng & đơn giá (Admin) — luật cấu hình không sửa code. *(FR-006)*
- [x] T531 [API] `GET /automation/integrations` + `POST /{id}/sync` (mock, **idempotent**, ghi `integration_logs`) + `GET /{id}/logs`. *(FR-005, SC-004)*

## Phase 4 — Web + kiểm thử

- [x] T540 [WEB] Trang **Tự động hóa** `/automation`: tabs (Cảnh báo trễ · Gợi ý phân công · KPI & lương · Giá vốn · Tích hợp) + modal Cấu hình; thêm vào nav.
- [x] T541 [WEB] Hiện số "đơn nguy cơ trễ" trên Dashboard.
- [x] T542 [TEST] Selftest: delay-risk, ranking phân công, KPI/lương, costing 3 thành phần, settings đổi → kết quả đổi, sync idempotent. *(SC-001..004)*

## Map US → Tasks

| US | Tasks |
|---|---|
| US1 | T510, T540, T541 |
| US2 | T511, T540 |
| US3 | T520, T540 |
| US4 | T521, T540 |
| US5 | T531, T540 |
| FR-006 | T530 |
