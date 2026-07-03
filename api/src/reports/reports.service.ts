import { Injectable } from '@nestjs/common';
import {
  INVENTORY_GROUP_LABELS,
  InventoryGroup,
  InventoryTxnType,
  ORDER_STATUS_LABELS,
  OrderStatus,
  QCResult,
  STEP_LABELS,
  StepName,
  StepStatus,
} from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_STATUSES = [
  OrderStatus.WAITING_PRODUCTION,
  OrderStatus.IN_PRODUCTION,
  OrderStatus.WAITING_QC,
  OrderStatus.NEEDS_REWORK,
  OrderStatus.QC_FAILED,
];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Khoảng ngày mặc định: 30 ngày gần nhất.
  private range(from?: string, to?: string) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 86400000);
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);
    return { gte: fromDate, lte: toDate };
  }

  // ─── US1: Báo cáo đơn hàng ─────────────────────────────────────────────────
  async orders(from?: string, to?: string) {
    const r = this.range(from, to);
    const where = { createdAt: r };

    const [byStatusRaw, byChannelRaw, total, all] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.order.groupBy({ by: ['salesChannel'], where, _count: { _all: true } }),
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        select: { id: true, status: true, customerId: true, createdAt: true, updatedAt: true, deadline: true, customer: { select: { name: true } } },
      }),
    ]);

    const byStatus = byStatusRaw.map((s) => ({ status: s.status, label: ORDER_STATUS_LABELS[s.status as OrderStatus] ?? s.status, count: s._count._all }));
    const byChannel = byChannelRaw.map((s) => ({ channel: s.salesChannel ?? 'KHÁC', count: s._count._all }));

    // Top khách theo số đơn
    const custMap: Record<string, { name: string; count: number }> = {};
    for (const o of all) {
      const k = o.customerId;
      custMap[k] = custMap[k] ?? { name: o.customer?.name ?? '—', count: 0 };
      custMap[k].count++;
    }
    const byCustomer = Object.values(custMap).sort((a, b) => b.count - a.count).slice(0, 10);

    // Đơn trễ
    const now = Date.now();
    const lateOrders = all
      .filter((o) => o.deadline && new Date(o.deadline).getTime() < now && ACTIVE_STATUSES.includes(o.status as OrderStatus))
      .map((o) => ({ customer: o.customer?.name, status: o.status, deadline: o.deadline }));

    // Thời gian xử lý TB (đơn đã hoàn thành/nhập kho): updatedAt - createdAt (giờ)
    const done = all.filter((o) => [OrderStatus.PRODUCTION_DONE, OrderStatus.STOCKED, OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(o.status as OrderStatus));
    const avgProcessingHours = done.length
      ? round2(done.reduce((s, o) => s + (new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()) / 3600000, 0) / done.length)
      : 0;

    return { range: { from: r.gte, to: r.lte }, total, byStatus, byChannel, byCustomer, lateCount: lateOrders.length, lateOrders, avgProcessingHours };
  }

  // ─── US1: Báo cáo sản xuất ─────────────────────────────────────────────────
  async production(from?: string, to?: string) {
    const r = this.range(from, to);

    const doneSteps = await this.prisma.productionStep.findMany({
      where: { status: StepStatus.DONE, completedAt: r },
      select: { stepName: true, startedAt: true, completedAt: true },
    });
    const activeSteps = await this.prisma.productionStep.groupBy({
      by: ['stepName'],
      where: { status: { in: [StepStatus.NOT_STARTED, StepStatus.IN_PROGRESS, StepStatus.NEEDS_REWORK] } },
      _count: { _all: true },
    });

    // Sản lượng theo ngày (số công đoạn hoàn thành/ngày)
    const byDayMap: Record<string, number> = {};
    const byStepMap: Record<string, number> = {};
    const stepDur: Record<string, { sum: number; n: number }> = {};
    for (const s of doneSteps) {
      if (s.completedAt) byDayMap[dayKey(new Date(s.completedAt))] = (byDayMap[dayKey(new Date(s.completedAt))] ?? 0) + 1;
      byStepMap[s.stepName] = (byStepMap[s.stepName] ?? 0) + 1;
      if (s.startedAt && s.completedAt) {
        const h = (new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 3600000;
        stepDur[s.stepName] = stepDur[s.stepName] ?? { sum: 0, n: 0 };
        stepDur[s.stepName].sum += h;
        stepDur[s.stepName].n++;
      }
    }

    const outputByDay = Object.entries(byDayMap).map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day));
    const byStep = Object.entries(byStepMap).map(([step, count]) => ({ step, label: STEP_LABELS[step as StepName] ?? step, count }));
    const stuckStages = activeSteps.map((s) => ({ step: s.stepName, label: STEP_LABELS[s.stepName as StepName] ?? s.stepName, count: s._count._all })).sort((a, b) => b.count - a.count);
    const avgHoursPerStep = Object.entries(stepDur).map(([step, v]) => ({ step, label: STEP_LABELS[step as StepName] ?? step, avgHours: round2(v.sum / v.n) }));

    return { range: { from: r.gte, to: r.lte }, totalCompletedSteps: doneSteps.length, outputByDay, byStep, stuckStages, avgHoursPerStep };
  }

  // ─── US2: Báo cáo QC ───────────────────────────────────────────────────────
  async qc(from?: string, to?: string) {
    const r = this.range(from, to);
    const records = await this.prisma.qCRecord.findMany({
      where: { createdAt: r },
      include: {
        returnStep: { select: { stepName: true, assignedTo: { select: { name: true } } } },
        orderItem: { select: { category: true } },
      },
    });

    const pass = records.filter((x) => x.result === QCResult.PASS).length;
    const fail = records.filter((x) => x.result !== QCResult.PASS).length;
    const passRate = pass + fail > 0 ? round2((pass / (pass + fail)) * 100) : 0;

    const byType: Record<string, number> = {};
    const byStep: Record<string, number> = {};
    const byWorker: Record<string, number> = {};
    for (const x of records.filter((x) => x.result !== QCResult.PASS)) {
      if (x.defectType) byType[x.defectType] = (byType[x.defectType] ?? 0) + 1;
      const step = x.returnStep?.stepName;
      if (step) byStep[step] = (byStep[step] ?? 0) + 1;
      const w = x.returnStep?.assignedTo?.name;
      if (w) byWorker[w] = (byWorker[w] ?? 0) + 1;
    }
    const reworkCount = records.filter((x) => x.attempt > 1).length;

    return {
      range: { from: r.gte, to: r.lte },
      total: records.length, pass, fail, passRate,
      defectsByType: Object.entries(byType).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
      defectsByStep: Object.entries(byStep).map(([step, count]) => ({ step, label: STEP_LABELS[step as StepName] ?? step, count })),
      defectsByWorker: Object.entries(byWorker).map(([worker, count]) => ({ worker, count })).sort((a, b) => b.count - a.count),
      reworkCount,
    };
  }

  // ─── US3: Báo cáo hao hụt ──────────────────────────────────────────────────
  async loss(from?: string, to?: string) {
    const r = this.range(from, to);
    const logs = await this.prisma.weightLog.findMany({
      where: { measuredAt: r },
      include: { measuredBy: { select: { name: true } }, order: { select: { code: true } } },
    });

    // Tổng vào/ra từ order_items có cân (mốc đầu/cuối)
    const items = await this.prisma.orderItem.findMany({
      where: { initialWeight: { not: null }, weightLogs: { some: { measuredAt: r } } },
      select: { initialWeight: true, currentWeight: true, category: true },
    });
    const totalInput = round2(items.reduce((s, it) => s + (it.initialWeight ?? 0), 0));
    const totalOutput = round2(items.reduce((s, it) => s + (it.currentWeight ?? 0), 0));
    const totalLoss = round2(totalInput - totalOutput);
    const avgLossPercent = totalInput > 0 ? round2((totalLoss / totalInput) * 100) : 0;

    const byStep: Record<string, number> = {};
    const byWorker: Record<string, number> = {};
    const byProduct: Record<string, number> = {};
    for (const l of logs) {
      byStep[l.stageName] = round2((byStep[l.stageName] ?? 0) + l.lossWeight);
      const w = l.measuredBy?.name ?? '—';
      byWorker[w] = round2((byWorker[w] ?? 0) + l.lossWeight);
    }
    for (const it of items) {
      const c = it.category ?? 'Khác';
      byProduct[c] = round2((byProduct[c] ?? 0) + ((it.initialWeight ?? 0) - (it.currentWeight ?? 0)));
    }

    const exceedList = logs
      .filter((l) => l.exceedsAllowed)
      .map((l) => ({ order: l.order?.code, stage: l.stageName, by: l.measuredBy?.name, cumulativePercent: l.cumulativeLossPercent, allowed: l.allowedLossPercent }));

    return {
      range: { from: r.gte, to: r.lte },
      totalInput, totalOutput, totalLoss, avgLossPercent, logCount: logs.length,
      byStep: Object.entries(byStep).map(([step, lossWeight]) => ({ step, label: STEP_LABELS[step as StepName] ?? step, lossWeight })),
      byWorker: Object.entries(byWorker).map(([worker, lossWeight]) => ({ worker, lossWeight })).sort((a, b) => b.lossWeight - a.lossWeight),
      byProduct: Object.entries(byProduct).map(([product, lossWeight]) => ({ product, lossWeight })),
      exceedCount: exceedList.length, exceedList,
    };
  }

  // ─── US4: Năng suất thợ ────────────────────────────────────────────────────
  async productivity(from?: string, to?: string) {
    const r = this.range(from, to);
    // Phase 007: năng suất tính theo NGƯỜI THỰC HIỆN (performedById).
    const steps = await this.prisma.productionStep.findMany({
      where: { status: StepStatus.DONE, completedAt: r, performedById: { not: null } },
      include: { performedBy: { select: { id: true, name: true } }, order: { select: { deadline: true } } },
    });

    const map: Record<string, { name: string; completed: number; onTime: number; defect: number; output: number }> = {};
    for (const s of steps) {
      const id = s.performedById!;
      map[id] = map[id] ?? { name: s.performedBy?.name ?? '—', completed: 0, onTime: 0, defect: 0, output: 0 };
      map[id].completed++;
      map[id].output += s.completedQuantity ?? 1;
      map[id].defect += s.defectQuantity ?? 0;
      if (s.order?.deadline && s.completedAt && new Date(s.completedAt) <= new Date(s.order.deadline)) map[id].onTime++;
    }
    const rows = Object.values(map)
      .map((w) => ({
        worker: w.name,
        completed: w.completed,
        onTimeRate: w.completed ? round2((w.onTime / w.completed) * 100) : 0,
        defectRate: w.output ? round2((w.defect / w.output) * 100) : 0,
      }))
      .sort((a, b) => b.completed - a.completed || b.onTimeRate - a.onTimeRate);

    return { range: { from: r.gte, to: r.lte }, rows };
  }

  // ─── US5: Báo cáo tồn kho ──────────────────────────────────────────────────
  async inventory() {
    const items = await this.prisma.inventoryItem.findMany();
    const byGroupMap: Record<string, { value: number; count: number; stock: number }> = {};
    let totalValue = 0;
    for (const i of items) {
      const value = (i.currentStock ?? 0) * (i.costPrice ?? 0);
      totalValue += value;
      const g = i.group ?? 'OTHER';
      byGroupMap[g] = byGroupMap[g] ?? { value: 0, count: 0, stock: 0 };
      byGroupMap[g].value += value;
      byGroupMap[g].count++;
    }
    const byGroup = Object.entries(byGroupMap).map(([group, v]) => ({ group, label: INVENTORY_GROUP_LABELS[group as InventoryGroup] ?? group, value: round2(v.value), count: v.count }));
    const lowStock = items
      .filter((i) => i.currentStock <= i.minStock)
      .map((i) => ({ code: i.code, name: i.name, currentStock: i.currentStock, minStock: i.minStock }));

    // Vật tư tiêu hao nhiều nhất (tổng OUT)
    const outs = await this.prisma.inventoryTransaction.groupBy({
      by: ['inventoryItemId'],
      where: { type: InventoryTxnType.OUT },
      _sum: { quantity: true },
    });
    const itemNames: Record<string, string> = Object.fromEntries(items.map((i) => [i.id, i.name]));
    const topConsumed = outs
      .map((o) => ({ name: itemNames[o.inventoryItemId] ?? o.inventoryItemId, quantity: round2(o._sum.quantity ?? 0) }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return { totalValue: round2(totalValue), byGroup, lowStockCount: lowStock.length, lowStock, topConsumed };
  }

  // ─── US6: Dashboard nâng cao ──────────────────────────────────────────────
  async dashboardAdvanced(from?: string, to?: string) {
    const last7 = new Date(Date.now() - 6 * 86400000);
    last7.setHours(0, 0, 0, 0);

    const [doneSteps, weightLogs, recent, prod, inv] = await Promise.all([
      this.prisma.productionStep.findMany({ where: { status: StepStatus.DONE, completedAt: { gte: last7 } }, select: { completedAt: true } }),
      this.prisma.weightLog.findMany({ where: { measuredAt: { gte: last7 } }, select: { measuredAt: true, lossWeight: true } }),
      this.prisma.activityLog.findMany({
        take: 12, orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } }, order: { select: { code: true } } },
      }),
      this.productivity(),
      this.inventory(),
    ]);

    // Khung 7 ngày
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) days.push(dayKey(new Date(Date.now() - i * 86400000)));
    const outputMap: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
    const lossMap: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
    for (const s of doneSteps) if (s.completedAt) { const k = dayKey(new Date(s.completedAt)); if (k in outputMap) outputMap[k]++; }
    for (const l of weightLogs) { const k = dayKey(new Date(l.measuredAt)); if (k in lossMap) lossMap[k] = round2(lossMap[k] + l.lossWeight); }

    return {
      output7d: days.map((d) => ({ day: d.slice(5), count: outputMap[d] })),
      lossTrend: days.map((d) => ({ day: d.slice(5), loss: lossMap[d] })),
      recentActivity: recent.map((a) => ({ action: a.action, user: a.user?.name ?? 'Hệ thống', order: a.order?.code, at: a.createdAt })),
      workerTop: prod.rows.slice(0, 5),
      inventoryStructure: inv.byGroup,
    };
  }

  // ─── US7: Xuất CSV ─────────────────────────────────────────────────────────
  async exportCsv(kind: string, from?: string, to?: string): Promise<string> {
    const csv = (headers: string[], rows: (string | number)[][]) =>
      '﻿' + [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');

    switch (kind) {
      case 'orders': {
        const d = await this.orders(from, to);
        return csv(['Trạng thái', 'Số đơn'], d.byStatus.map((s) => [s.label, s.count]));
      }
      case 'production': {
        const d = await this.production(from, to);
        return csv(['Công đoạn', 'SL hoàn thành', 'Giờ TB'], d.byStep.map((s) => {
          const avg = d.avgHoursPerStep.find((a) => a.step === s.step);
          return [s.label, s.count, avg?.avgHours ?? ''];
        }));
      }
      case 'qc': {
        const d = await this.qc(from, to);
        return csv(['Loại lỗi', 'Số lượng'], d.defectsByType.map((x) => [x.type, x.count]));
      }
      case 'loss': {
        const d = await this.loss(from, to);
        return csv(['Đơn', 'Công đoạn', 'Người', 'Lũy kế %', 'Định mức %'], d.exceedList.map((x) => [x.order, x.stage, x.by, x.cumulativePercent, x.allowed]));
      }
      case 'productivity': {
        const d = await this.productivity(from, to);
        return csv(['Thợ', 'Hoàn thành', 'Đúng hạn %', 'Tỷ lệ lỗi %'], d.rows.map((x) => [x.worker, x.completed, x.onTimeRate, x.defectRate]));
      }
      case 'inventory': {
        const d = await this.inventory();
        return csv(['Nhóm', 'Số mặt hàng', 'Giá trị'], d.byGroup.map((x) => [x.label, x.count, x.value]));
      }
      default:
        return csv(['Lỗi'], [['Không có loại báo cáo: ' + kind]]);
    }
  }
}
