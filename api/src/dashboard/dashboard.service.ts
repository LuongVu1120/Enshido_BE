import { Injectable } from '@nestjs/common';
import { OrderStatus, QCResult, STEP_LABELS, StepName, StepStatus } from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // GET /dashboard/summary (FR-015) — chỉ số vận hành cốt lõi.
  async summary() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      inProduction,
      waitingQC,
      overdue,
      completedToday,
      qcPass,
      qcFail,
      steps,
    ] = await Promise.all([
      this.prisma.order.count({ where: { status: { not: OrderStatus.CANCELLED } } }),
      this.prisma.order.count({ where: { status: OrderStatus.IN_PRODUCTION } }),
      this.prisma.order.count({ where: { status: OrderStatus.WAITING_QC } }),
      this.prisma.order.count({
        where: {
          deadline: { lt: new Date() },
          status: {
            in: [
              OrderStatus.WAITING_PRODUCTION,
              OrderStatus.IN_PRODUCTION,
              OrderStatus.WAITING_QC,
              OrderStatus.NEEDS_REWORK,
            ],
          },
        },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.PRODUCTION_DONE, updatedAt: { gte: startOfToday } },
      }),
      this.prisma.qCRecord.count({ where: { result: QCResult.PASS } }),
      this.prisma.qCRecord.count({ where: { result: { in: [QCResult.FAIL, QCResult.NEEDS_REWORK] } } }),
      this.prisma.productionStep.groupBy({
        by: ['stepName'],
        where: { status: { in: [StepStatus.NOT_STARTED, StepStatus.IN_PROGRESS, StepStatus.NEEDS_REWORK] } },
        _count: { _all: true },
      }),
    ]);

    const qcTotal = qcPass + qcFail;
    const qcPassRate = qcTotal > 0 ? Math.round((qcPass / qcTotal) * 1000) / 10 : 0;

    // Phân bố đơn theo trạng thái (cho biểu đồ).
    const byStatusRaw = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const byStatus = byStatusRaw.map((r) => ({ status: r.status, count: r._count._all }));

    // Công đoạn đang tắc (nhiều đơn ùn nhất).
    const stuckStages = steps
      .map((s) => ({
        step: s.stepName,
        label: STEP_LABELS[s.stepName as StepName] ?? s.stepName,
        count: s._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      cards: {
        totalOrders,
        inProduction,
        waitingQC,
        overdue,
        completedToday,
        qcFail,
        qcPassRate,
      },
      byStatus,
      stuckStages,
    };
  }
}
