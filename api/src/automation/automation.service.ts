import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AUTOMATION_DEFAULTS,
  AutomationSettings,
  DelayRisk,
  InventoryTxnType,
  OrderStatus,
  Role,
  STEP_LABELS,
  StepName,
  StepStatus,
  UserStatus,
} from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { AuthUser } from '../common/decorators';

const ACTIVE_ORDER = [
  OrderStatus.WAITING_PRODUCTION,
  OrderStatus.IN_PRODUCTION,
  OrderStatus.WAITING_QC,
  OrderStatus.NEEDS_REWORK,
  OrderStatus.QC_FAILED,
];
const ACTIVE_STEP = [StepStatus.NOT_STARTED, StepStatus.ACCEPTED, StepStatus.IN_PROGRESS, StepStatus.NEEDS_REWORK];
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class AutomationService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ─── Cấu hình (FR-006) — đọc/ghi không cần sửa code ───────────────────────
  async getSettings(): Promise<AutomationSettings> {
    const rows = await this.prisma.setting.findMany();
    const merged: any = { ...AUTOMATION_DEFAULTS };
    for (const r of rows) {
      if (r.key in merged) {
        try {
          merged[r.key] = JSON.parse(r.value);
        } catch {
          /* giữ default */
        }
      }
    }
    return merged;
  }

  async updateSettings(dto: Partial<AutomationSettings>, user: AuthUser) {
    for (const [key, value] of Object.entries(dto)) {
      if (!(key in AUTOMATION_DEFAULTS)) continue;
      await this.prisma.setting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) },
      });
    }
    await this.audit.log({ userId: user.id, action: 'automation.settings.update', objectType: 'settings', newValue: dto });
    return this.getSettings();
  }

  // ─── US1: Cảnh báo nguy cơ trễ đơn ────────────────────────────────────────
  async delayRisk() {
    const s = await this.getSettings();
    const orders = await this.prisma.order.findMany({
      where: { status: { in: ACTIVE_ORDER }, deadline: { not: null } },
      include: {
        customer: { select: { name: true } },
        steps: { select: { status: true } },
      },
    });
    const now = Date.now();
    const items = orders
      .map((o) => {
        const remaining = o.steps.filter((st) => st.status !== StepStatus.DONE).length;
        const daysLeft = Math.ceil((new Date(o.deadline!).getTime() - now) / 86400000);
        const needDays = round2(remaining * s.avgDaysPerStep * s.delayRiskFactor);
        let risk: DelayRisk = DelayRisk.ON_TRACK;
        let reason = '';
        if (daysLeft < 0) {
          risk = DelayRisk.OVERDUE;
          reason = `Đã quá hạn ${Math.abs(daysLeft)} ngày, còn ${remaining} công đoạn`;
        } else if (daysLeft < needDays) {
          risk = DelayRisk.AT_RISK;
          reason = `Còn ${remaining} công đoạn (cần ~${needDays} ngày) nhưng chỉ còn ${daysLeft} ngày`;
        }
        return {
          orderId: o.id,
          code: o.code,
          customerName: o.customer.name,
          status: o.status,
          deadline: o.deadline,
          remainingSteps: remaining,
          daysLeft,
          risk,
          reason,
        };
      })
      .filter((x) => x.risk !== DelayRisk.ON_TRACK)
      .sort((a, b) => a.daysLeft - b.daysLeft);
    return { count: items.length, items };
  }

  // ─── US2: Gợi ý phân công thợ ─────────────────────────────────────────────
  async assignmentSuggestion(stepName?: string) {
    const workers = await this.prisma.user.findMany({
      where: { role: Role.WORKER, status: UserStatus.ACTIVE },
      include: { employee: { select: { skills: true } } },
    });
    const stepLabel = stepName ? STEP_LABELS[stepName as StepName] ?? stepName : null;

    const rows = await Promise.all(
      workers.map(async (w) => {
        const load = await this.prisma.productionStep.count({
          where: { assignedToId: w.id, status: { in: ACTIVE_STEP } },
        });
        const skills = (w.employee?.skills ?? '').toLowerCase();
        const skillMatch = stepLabel ? skills.includes(stepLabel.toLowerCase()) : false;
        return { workerId: w.id, name: w.name, load, skillMatch };
      }),
    );
    // Ưu tiên: khớp kỹ năng trước, rồi tải thấp.
    rows.sort((a, b) => Number(b.skillMatch) - Number(a.skillMatch) || a.load - b.load);
    return { step: stepLabel, suggestions: rows };
  }

  // ─── US3: KPI & lương theo sản lượng ──────────────────────────────────────
  private monthRange(month?: string) {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth() + 1;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [yy, mm] = month.split('-').map(Number);
      y = yy;
      m = mm;
    }
    return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0, 23, 59, 59, 999), label: `${String(m).padStart(2, '0')}/${y}` };
  }

  async kpi(month?: string) {
    const s = await this.getSettings();
    const { from, to, label } = this.monthRange(month);
    // Phase 007: KPI/lương theo NGƯỜI THỰC HIỆN (performedById).
    const steps = await this.prisma.productionStep.findMany({
      where: { status: StepStatus.DONE, completedAt: { gte: from, lte: to }, performedById: { not: null } },
      include: { performedBy: { select: { id: true, name: true } }, order: { select: { deadline: true } } },
    });

    const map: Record<string, { name: string; completed: number; onTime: number; defect: number; output: number }> = {};
    for (const st of steps) {
      const id = st.performedById!;
      map[id] = map[id] ?? { name: st.performedBy?.name ?? '—', completed: 0, onTime: 0, defect: 0, output: 0 };
      map[id].completed++;
      map[id].output += st.completedQuantity ?? 1;
      map[id].defect += st.defectQuantity ?? 0;
      if (st.order?.deadline && st.completedAt && new Date(st.completedAt) <= new Date(st.order.deadline)) map[id].onTime++;
    }

    const rows = Object.values(map)
      .map((w) => {
        const onTimeRate = w.completed ? round2((w.onTime / w.completed) * 100) : 0;
        const defectRate = w.output ? round2((w.defect / w.output) * 100) : 0;
        const outputSalary = w.completed * s.kpiRatePerStep;
        const bonus = Math.round(outputSalary * s.onTimeBonusRate * (onTimeRate / 100));
        const penalty = w.defect * s.defectPenaltyPerUnit;
        const total = outputSalary + bonus - penalty;
        return {
          worker: w.name,
          completed: w.completed,
          onTimeRate,
          defectRate,
          outputSalary,
          bonus,
          penalty,
          total,
          kpiScore: round2(onTimeRate - defectRate),
        };
      })
      .sort((a, b) => b.total - a.total);

    return { month: label, rates: { kpiRatePerStep: s.kpiRatePerStep, onTimeBonusRate: s.onTimeBonusRate, defectPenaltyPerUnit: s.defectPenaltyPerUnit }, rows };
  }

  // ─── US4: Giá vốn sản phẩm ────────────────────────────────────────────────
  async costing(orderId: string) {
    const s = await this.getSettings();
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, steps: { select: { status: true } } },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn');

    const txns = await this.prisma.inventoryTransaction.findMany({
      where: { orderId, type: InventoryTxnType.OUT },
      include: { inventoryItem: { select: { name: true, costPrice: true, unit: true } } },
    });
    const materialItems = txns.map((t) => {
      const unitPrice = t.unitPrice ?? t.inventoryItem?.costPrice ?? 0;
      return { name: t.inventoryItem?.name, quantity: t.quantity, unit: t.inventoryItem?.unit, amount: round2(t.quantity * unitPrice) };
    });
    const materialCost = round2(materialItems.reduce((a, b) => a + b.amount, 0));

    const doneSteps = order.steps.filter((st) => st.status === StepStatus.DONE).length;
    const laborCost = doneSteps * s.laborCostPerStep;

    const lossGrams = round2(
      order.items.reduce((a, it) => a + Math.max(0, (it.initialWeight ?? 0) - (it.currentWeight ?? 0)), 0),
    );
    const lossCost = Math.round(lossGrams * s.metalPricePerGram);

    const total = round2(materialCost + laborCost + lossCost);
    return {
      orderId,
      orderCode: order.code,
      breakdown: {
        material: { amount: materialCost, items: materialItems },
        labor: { amount: laborCost, doneSteps, ratePerStep: s.laborCostPerStep },
        loss: { amount: lossCost, grams: lossGrams, pricePerGram: s.metalPricePerGram },
      },
      total,
    };
  }

  // ─── US5 (P3): Tích hợp — stub + log idempotent ──────────────────────────
  async listIntegrations() {
    return this.prisma.integration.findMany({ orderBy: { createdAt: 'asc' }, include: { _count: { select: { logs: true } } } });
  }

  async sync(id: string, user: AuthUser, today: string) {
    const integ = await this.prisma.integration.findUnique({ where: { id } });
    if (!integ) throw new NotFoundException('Không tìm thấy kết nối');
    const action = integ.provider === 'ACCOUNTING' ? 'sync.accounting' : 'sync.orders';
    const ref = today; // khóa idempotent theo ngày

    // Idempotent: đã đồng bộ thành công trong ngày → SKIPPED, không tạo bản ghi trùng.
    const existed = await this.prisma.integrationLog.findFirst({ where: { integrationId: id, action, ref, status: 'OK' } });
    if (existed) {
      return { status: 'SKIPPED', message: 'Đã đồng bộ trong hôm nay (idempotent).', log: existed };
    }

    // Mock: "đồng bộ" — đếm vài đơn gần đây làm dữ liệu giả lập.
    const synced = await this.prisma.order.count({ where: { status: { in: [OrderStatus.STOCKED, OrderStatus.DELIVERED, OrderStatus.COMPLETED] } } });
    const log = await this.prisma.integrationLog.create({
      data: { integrationId: id, action, status: 'OK', ref, message: `Đồng bộ ${synced} đơn/bút toán (giả lập).` },
    });
    await this.prisma.integration.update({ where: { id }, data: { status: 'CONNECTED', lastSyncAt: new Date(today) } });
    await this.audit.log({ userId: user.id, action: 'automation.integration.sync', objectType: 'integration', objectId: id, newValue: { synced } });
    return { status: 'OK', message: log.message, log };
  }

  async logs(id: string) {
    return this.prisma.integrationLog.findMany({ where: { integrationId: id }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
}
