import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, QCResult, StepName, StepStatus } from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { EventsGateway } from '../common/events.gateway';
import { AuthUser } from '../common/decorators';
import { sanitizeRichText } from '../common/sanitize.util';
import { QCFailDto, QCPassDto } from './dto';

// Phase 012: tự chọn công đoạn trả về khi QC không chỉ định — công đoạn SX đã xong
// gần nhất (loại QC/Nhập kho); fallback công đoạn SX đầu tiên.
function pickReturnStep<T extends { stepName: string; stepOrder: number; status: string }>(steps: T[]): T | null {
  const prod = steps.filter((s) => s.stepName !== StepName.QC && s.stepName !== StepName.STOCK_IN);
  const done = prod.filter((s) => s.status === StepStatus.DONE).sort((a, b) => b.stepOrder - a.stepOrder);
  if (done[0]) return done[0];
  return [...prod].sort((a, b) => a.stepOrder - b.stepOrder)[0] ?? null;
}

@Injectable()
export class QCService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private events: EventsGateway,
  ) {}

  // Đơn cần QC (FR-012).
  async listForQC() {
    return this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.WAITING_QC, OrderStatus.NEEDS_REWORK, OrderStatus.QC_FAILED] },
      },
      orderBy: { deadline: 'asc' },
      include: {
        customer: { select: { name: true, code: true } },
        items: true,
        steps: { orderBy: { stepOrder: 'asc' } },
        qcRecords: { orderBy: { createdAt: 'desc' }, include: { qcUser: { select: { name: true } } } },
        weightLogs: { select: { exceedsAllowed: true, cumulativeLossPercent: true } },
      },
    });
  }

  // Thống kê QC (Phase 009) — cho cả vai trò QC.
  async stats() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [pending, passedToday, failedToday] = await Promise.all([
      this.prisma.order.count({
        where: { status: { in: [OrderStatus.WAITING_QC, OrderStatus.NEEDS_REWORK, OrderStatus.QC_FAILED] } },
      }),
      this.prisma.qCRecord.count({ where: { result: QCResult.PASS, createdAt: { gte: start } } }),
      this.prisma.qCRecord.count({ where: { result: { in: [QCResult.FAIL, QCResult.NEEDS_REWORK] }, createdAt: { gte: start } } }),
    ]);
    const total = passedToday + failedToday;
    return { pending, passedToday, failedToday, passRateToday: total ? Math.round((passedToday / total) * 1000) / 10 : 0 };
  }

  private async nextAttempt(orderId: string) {
    const count = await this.prisma.qCRecord.count({ where: { orderId } });
    return count + 1;
  }

  // PASS → Hoàn thành sản xuất (US8.1).
  async pass(orderId: string, dto: QCPassDto, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { steps: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn');

    const record = await this.prisma.qCRecord.create({
      data: {
        orderId,
        orderItemId: dto.orderItemId,
        qcUserId: user.id,
        result: QCResult.PASS,
        note: dto.note,
        checklist: dto.checklist ?? null, // đã là JSON string từ client
        attempt: await this.nextAttempt(orderId),
      },
    });

    // Đánh dấu công đoạn QC hoàn thành.
    const qcStep = order.steps.find((s) => s.stepName === StepName.QC);
    if (qcStep) {
      await this.prisma.productionStep.update({
        where: { id: qcStep.id },
        data: { status: StepStatus.DONE, completedAt: new Date() },
      });
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PRODUCTION_DONE },
    });

    await this.audit.log({
      userId: user.id,
      orderId,
      action: 'qc.pass',
      objectType: 'qc_record',
      objectId: record.id,
      newValue: { result: QCResult.PASS },
    });
    this.events.orderChanged(orderId, OrderStatus.PRODUCTION_DONE);
    return record;
  }

  // FAIL / CẦN SỬA → trả về đúng công đoạn, tạo việc sửa (US8.2, FR-013).
  async fail(orderId: string, dto: QCFailDto, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { steps: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn');

    // Phase 012: dùng công đoạn trả về nếu có, ngược lại tự chọn.
    const returnStep = dto.returnStepId
      ? order.steps.find((s) => s.id === dto.returnStepId)
      : pickReturnStep(order.steps);
    if (dto.returnStepId && !returnStep)
      throw new BadRequestException('Công đoạn trả về không thuộc đơn này');
    if (!returnStep)
      throw new BadRequestException('Đơn chưa có công đoạn sản xuất để trả về');

    const record = await this.prisma.qCRecord.create({
      data: {
        orderId,
        orderItemId: dto.orderItemId,
        qcUserId: user.id,
        result: dto.result,
        defectType: dto.defectType,
        severity: dto.severity,
        returnStepId: returnStep.id,
        assignedReworkUserId: dto.assignedReworkUserId,
        reworkDeadline: dto.reworkDeadline ? new Date(dto.reworkDeadline) : null,
        imageUrls: JSON.stringify(dto.imageUrls ?? []),
        checklist: dto.checklist ?? null, // đã là JSON string từ client
        note: sanitizeRichText(dto.note), // mô tả rich text (Phase 012)
        attempt: await this.nextAttempt(orderId),
      },
    });

    // Đưa công đoạn trả về trạng thái "Cần sửa", tăng số lần làm lại; reset QC step.
    await this.prisma.$transaction([
      this.prisma.productionStep.update({
        where: { id: returnStep.id },
        data: {
          status: StepStatus.NEEDS_REWORK,
          reworkCount: { increment: 1 },
          assignedToId: dto.assignedReworkUserId ?? returnStep.assignedToId,
          completedAt: null,
        },
      }),
      // Các công đoạn sau công đoạn trả về (gồm QC) mở lại để chạy tiếp sau khi sửa.
      this.prisma.productionStep.updateMany({
        where: { orderId, stepOrder: { gt: returnStep.stepOrder } },
        data: { status: StepStatus.NOT_STARTED, completedAt: null },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.NEEDS_REWORK },
      }),
    ]);

    await this.audit.log({
      userId: user.id,
      orderId,
      action: 'qc.fail',
      objectType: 'qc_record',
      objectId: record.id,
      newValue: {
        result: dto.result,
        defectType: dto.defectType,
        returnStep: returnStep.stepName,
        reworkBy: dto.assignedReworkUserId,
      },
    });
    this.events.orderChanged(orderId, OrderStatus.NEEDS_REWORK);
    return record;
  }

  // Lịch sử QC nhiều lần (US8.3).
  async history(orderId: string) {
    return this.prisma.qCRecord.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      include: {
        qcUser: { select: { id: true, name: true } },
        returnStep: { select: { stepName: true } },
        reworkUser: { select: { id: true, name: true } },
      },
    });
  }
}
