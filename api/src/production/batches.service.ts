import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  allocateBatchLoss,
  BATCHABLE_STEPS_DEFAULT,
  BatchStatus,
  OrderStatus,
  STEP_LABELS,
  StepName,
  StepStatus,
} from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';
import { CodesService } from '../common/codes.service';
import { AuditService } from '../common/audit.service';
import { EventsGateway } from '../common/events.gateway';
import { AuthUser } from '../common/decorators';
import { WeightService } from '../weight/weight.service';
import { ProductionService } from './production.service';
import { AddBatchMemberDto, CloseBatchDto, CreateBatchDto, RemoveBatchMemberDto } from './dto';

const ACTIVE_ORDER_STATUSES = [
  OrderStatus.WAITING_PRODUCTION,
  OrderStatus.IN_PRODUCTION,
  OrderStatus.NEEDS_REWORK,
  OrderStatus.QC_FAILED,
];
const ADDABLE_STEP_STATUSES = [StepStatus.NOT_STARTED, StepStatus.ACCEPTED, StepStatus.IN_PROGRESS, StepStatus.NEEDS_REWORK];

@Injectable()
export class BatchesService {
  constructor(
    private prisma: PrismaService,
    private codes: CodesService,
    private audit: AuditService,
    private events: EventsGateway,
    private weight: WeightService,
    private production: ProductionService,
  ) {}

  // ─── Công đoạn được phép chạy theo lô (cấu hình được — lưu ở Setting) ───────
  async getBatchableSteps(): Promise<string[]> {
    const s = await this.prisma.setting.findUnique({ where: { key: 'batchableSteps' } });
    if (s?.value) { try { const v = JSON.parse(s.value); if (Array.isArray(v) && v.length) return v; } catch {} }
    return [...BATCHABLE_STEPS_DEFAULT];
  }

  async setBatchableSteps(steps: string[], user: AuthUser) {
    const valid = steps.filter((s) => Object.values(StepName).includes(s as StepName));
    await this.prisma.setting.upsert({
      where: { key: 'batchableSteps' },
      update: { value: JSON.stringify(valid) },
      create: { key: 'batchableSteps', value: JSON.stringify(valid) },
    });
    await this.audit.log({ userId: user.id, action: 'batch.config.update', objectType: 'setting', objectId: 'batchableSteps', newValue: { steps: valid } });
    return { batchableSteps: valid };
  }

  // ─── Danh sách / chi tiết ──────────────────────────────────────────────────
  async list(filters: { status?: string; stepName?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.stepName) where.stepName = filters.stepName;
    const batches = await this.prisma.productionBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { performedBy: { select: { id: true, name: true } }, _count: { select: { steps: true } } },
    });
    return batches.map((b) => ({ ...b, memberCount: b._count.steps }));
  }

  async detail(id: string) {
    const batch = await this.prisma.productionBatch.findUnique({
      where: { id },
      include: {
        performedBy: { select: { id: true, name: true } },
        steps: {
          include: {
            order: { select: { id: true, code: true, name: true, customer: { select: { name: true } } } },
            orderItem: { select: { id: true, productName: true, currentWeight: true, initialWeight: true } },
          },
        },
      },
    });
    if (!batch) throw new NotFoundException('Không tìm thấy lô');
    const members = await Promise.all(batch.steps.map(async (s) => ({
      stepId: s.id,
      status: s.status,
      order: s.order,
      orderItem: s.orderItem,
      // Đã chốt → dùng KL vào ĐÃ LƯU ở step (item.currentWeight lúc này = KL ra).
      // Đang mở → tính KL vào sống theo trọng lượng hiện tại của SP.
      inputWeight: s.inputWeight != null ? s.inputWeight : await this.resolveInputWeight(s),
      outputWeight: s.outputWeight,
      lossWeight: s.lossWeight,
      lossPercent: s.lossPercent,
    })));
    return { ...batch, members };
  }

  // KL vào công đoạn của 1 thành viên = KL hiện tại của SP (fallback initial / SP đầu đơn).
  private async resolveInputWeight(step: { orderItemId: string | null; orderId: string; inputWeight: number | null }): Promise<number> {
    if (step.orderItemId) {
      const it = await this.prisma.orderItem.findUnique({ where: { id: step.orderItemId }, select: { currentWeight: true, initialWeight: true } });
      if (it) return it.currentWeight ?? it.initialWeight ?? 0;
    }
    if (step.inputWeight != null) return step.inputWeight;
    const first = await this.prisma.orderItem.findFirst({ where: { orderId: step.orderId }, select: { currentWeight: true, initialWeight: true } });
    return first?.currentWeight ?? first?.initialWeight ?? 0;
  }

  // SP đại diện để ghi weight_log (ưu tiên orderItemId của step, fallback SP đầu đơn).
  private async resolveItemId(step: { orderItemId: string | null; orderId: string }): Promise<string | undefined> {
    if (step.orderItemId) return step.orderItemId;
    const first = await this.prisma.orderItem.findFirst({ where: { orderId: step.orderId }, select: { id: true } });
    return first?.id;
  }

  // ─── Tạo lô ────────────────────────────────────────────────────────────────
  async create(dto: CreateBatchDto, user: AuthUser) {
    const batchable = await this.getBatchableSteps();
    if (!batchable.includes(dto.stepName)) {
      throw new BadRequestException(`Công đoạn "${STEP_LABELS[dto.stepName as StepName] ?? dto.stepName}" không chạy theo lô. Cho phép: ${batchable.join(', ')}`);
    }
    const code = await this.codes.nextBatchCode();
    const batch = await this.prisma.productionBatch.create({
      data: { code, stepName: dto.stepName, status: BatchStatus.OPEN, note: dto.note, performedById: user.id },
    });
    await this.audit.log({ userId: user.id, action: 'batch.create', objectType: 'production_batch', objectId: batch.id, newValue: { code, stepName: dto.stepName } });
    this.events.emit('batch.changed', { batchId: batch.id });
    return this.detail(batch.id);
  }

  // Đơn đang chờ đúng công đoạn này (công đoạn HIỆN TẠI = stepName) & chưa vào lô.
  async candidates(stepName: string) {
    const orders = await this.prisma.order.findMany({
      where: { status: { in: ACTIVE_ORDER_STATUSES } },
      include: {
        customer: { select: { name: true } },
        items: { select: { id: true, productName: true, currentWeight: true, initialWeight: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
      },
      orderBy: { deadline: 'asc' },
    });
    const out: any[] = [];
    for (const o of orders) {
      const current = o.steps.find((s) => s.status !== StepStatus.DONE);
      if (!current || current.stepName !== stepName || current.batchId) continue;
      const item = current.orderItemId ? o.items.find((i) => i.id === current.orderItemId) : o.items[0];
      out.push({
        stepId: current.id,
        orderId: o.id,
        code: o.code,
        name: o.name,
        customerName: o.customer.name,
        deadline: o.deadline,
        priority: o.priority,
        productName: item?.productName,
        inputWeight: item?.currentWeight ?? item?.initialWeight ?? null,
      });
    }
    return out;
  }

  // ─── Thêm / bớt thành viên ─────────────────────────────────────────────────
  private async resolveTargetStep(dto: AddBatchMemberDto) {
    if (dto.stepId) {
      const s = await this.prisma.productionStep.findUnique({ where: { id: dto.stepId } });
      if (!s) throw new NotFoundException('Không tìm thấy công đoạn');
      return s;
    }
    let orderId = dto.orderId;
    if (!orderId && dto.qrToken) {
      const order = await this.prisma.order.findUnique({ where: { qrToken: dto.qrToken } });
      if (!order) throw new NotFoundException('QR không hợp lệ');
      if (!order.qrActive) throw new BadRequestException('QR đã bị vô hiệu hóa (đơn hủy)');
      orderId = order.id;
    }
    if (!orderId) throw new BadRequestException('Cần qrToken, orderId hoặc stepId');
    const current = await this.production.currentStepOfOrder(orderId);
    if (!current) throw new BadRequestException('Đơn không còn công đoạn cần xử lý');
    return this.prisma.productionStep.findUnique({ where: { id: current.id } }) as any;
  }

  async addMember(id: string, dto: AddBatchMemberDto, user: AuthUser) {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Không tìm thấy lô');
    if (batch.status !== BatchStatus.OPEN) throw new BadRequestException('Lô đã chốt/hủy, không thể thêm đơn');

    const step = await this.resolveTargetStep(dto);
    if (step.stepName !== batch.stepName) {
      throw new BadRequestException(`Đơn đang ở công đoạn "${STEP_LABELS[step.stepName as StepName] ?? step.stepName}", không khớp lô "${STEP_LABELS[batch.stepName as StepName] ?? batch.stepName}"`);
    }
    if (step.batchId === id) return this.detail(id); // đã trong lô
    if (step.batchId) throw new BadRequestException('Công đoạn này đã thuộc lô khác');
    if (!ADDABLE_STEP_STATUSES.includes(step.status as StepStatus)) throw new BadRequestException('Công đoạn không ở trạng thái có thể gom lô');
    // Phải là công đoạn HIỆN TẠI của đơn (các bước trước đã xong).
    const current = await this.production.currentStepOfOrder(step.orderId);
    if (!current || current.id !== step.id) throw new BadRequestException('Đơn chưa tới công đoạn này (còn bước trước chưa xong)');

    await this.prisma.productionStep.update({ where: { id: step.id }, data: { batchId: id, status: StepStatus.IN_PROGRESS, startedAt: step.startedAt ?? new Date(), performedById: user.id } });
    await this.audit.log({ userId: user.id, orderId: step.orderId, action: 'batch.member.add', objectType: 'production_batch', objectId: id, newValue: { stepId: step.id } });
    this.events.emit('batch.changed', { batchId: id });
    return this.detail(id);
  }

  async removeMember(id: string, dto: RemoveBatchMemberDto, user: AuthUser) {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Không tìm thấy lô');
    if (batch.status !== BatchStatus.OPEN) throw new BadRequestException('Lô đã chốt/hủy');
    const step = await this.prisma.productionStep.findUnique({ where: { id: dto.stepId } });
    if (!step || step.batchId !== id) throw new BadRequestException('Công đoạn không thuộc lô này');
    await this.prisma.productionStep.update({ where: { id: step.id }, data: { batchId: null } });
    await this.audit.log({ userId: user.id, orderId: step.orderId, action: 'batch.member.remove', objectType: 'production_batch', objectId: id, newValue: { stepId: step.id } });
    this.events.emit('batch.changed', { batchId: id });
    return this.detail(id);
  }

  // ─── Chốt lô: cân tổng → phân bổ về từng đơn (HP III) ──────────────────────
  async close(id: string, dto: CloseBatchDto, user: AuthUser) {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id }, include: { steps: true } });
    if (!batch) throw new NotFoundException('Không tìm thấy lô');
    if (batch.status !== BatchStatus.OPEN) throw new BadRequestException('Lô đã chốt/hủy');
    if (!batch.steps.length) throw new BadRequestException('Lô chưa có đơn nào');

    // KL vào từng thành viên.
    const overrideMap = new Map((dto.overrides ?? []).map((o) => [o.stepId, o.lossWeight]));
    const memberInputs = await Promise.all(batch.steps.map(async (s) => ({
      stepId: s.id,
      inputWeight: await this.resolveInputWeight(s),
      overrideLoss: overrideMap.has(s.id) ? overrideMap.get(s.id)! : null,
    })));
    if (memberInputs.some((m) => !m.inputWeight || m.inputWeight <= 0)) {
      throw new BadRequestException('Có đơn thiếu khối lượng vào — hãy nhập TL ban đầu/hiện tại trước khi chốt lô');
    }

    // Phân bổ hao hụt theo tỉ lệ KL (+ override) — dùng helper dùng chung.
    const alloc = allocateBatchLoss(
      memberInputs.map((m) => ({ key: m.stepId, inputWeight: m.inputWeight, overrideLoss: m.overrideLoss })),
      dto.totalOutputWeight,
    );
    const byKey = new Map(alloc.members.map((m) => [m.key, m]));

    // Ghi cân bất biến + hoàn thành từng công đoạn (tái dùng WeightService + ProductionService).
    for (const s of batch.steps) {
      const a = byKey.get(s.id)!;
      const itemId = await this.resolveItemId(s);
      const stageName = `${STEP_LABELS[batch.stepName as StepName] ?? batch.stepName} (lô ${batch.code})`;
      await this.weight.create(
        s.orderId,
        {
          orderItemId: itemId,
          productionStepId: s.id,
          stageName,
          previousWeight: a.inputWeight,
          currentWeight: a.outputWeight,
          confirmNegative: dto.confirmNegative ?? true, // chốt lô là chủ đích (kể cả tăng cân xi mạ)
          note: dto.note,
          allowedLossPercent: batch.allowedLossPercent,
        },
        user,
      );
      const fromStatus = s.status;
      await this.prisma.productionStep.update({
        where: { id: s.id },
        data: { status: StepStatus.DONE, completedAt: new Date(), performedById: user.id, version: { increment: 1 } },
      });
      await this.production.finalizeBatchStepCompletion(s.orderId, s.id, user, fromStatus);
    }

    const updated = await this.prisma.productionBatch.update({
      where: { id },
      data: {
        status: BatchStatus.DONE,
        totalInputWeight: alloc.totalInputWeight,
        totalOutputWeight: dto.totalOutputWeight,
        totalLossWeight: alloc.totalLossWeight,
        performedById: user.id,
        note: dto.note ?? batch.note,
        closedAt: new Date(),
      },
    });
    await this.audit.log({
      userId: user.id,
      action: 'batch.close',
      objectType: 'production_batch',
      objectId: id,
      newValue: { totalInput: alloc.totalInputWeight, totalOutput: dto.totalOutputWeight, totalLoss: alloc.totalLossWeight, members: batch.steps.length },
    });
    this.events.emit('batch.changed', { batchId: id });
    return { batch: updated, allocation: alloc };
  }

  async cancel(id: string, user: AuthUser) {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Không tìm thấy lô');
    if (batch.status !== BatchStatus.OPEN) throw new BadRequestException('Chỉ hủy được lô đang gom');
    await this.prisma.productionStep.updateMany({ where: { batchId: id }, data: { batchId: null } });
    const updated = await this.prisma.productionBatch.update({ where: { id }, data: { status: BatchStatus.CANCELLED, closedAt: new Date() } });
    await this.audit.log({ userId: user.id, action: 'batch.cancel', objectType: 'production_batch', objectId: id });
    this.events.emit('batch.changed', { batchId: id });
    return updated;
  }
}
