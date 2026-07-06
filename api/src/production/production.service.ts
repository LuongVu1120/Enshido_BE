import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_STEP_FLOW,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  OrderStatus,
  STEP_LABELS,
  StepName,
  StepStatus,
} from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { EventsGateway } from '../common/events.gateway';
import { AuthUser } from '../common/decorators';
import { WeightService } from '../weight/weight.service';
import { AssignStepDto, CompleteStepDto, ReportIssueDto, StepTargetDto } from './dto';

@Injectable()
export class ProductionService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private events: EventsGateway,
    private weight: WeightService,
  ) {}

  // ─── QR scan landing (FR-008) ─────────────────────────────────────────────
  async scanLanding(qrToken: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { qrToken },
      include: {
        customer: { select: { code: true, name: true } },
        items: true,
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { assignedTo: { select: { id: true, name: true } } },
        },
      },
    });
    if (!order) throw new NotFoundException('QR không hợp lệ');
    if (!order.qrActive)
      throw new BadRequestException('QR đã bị vô hiệu hóa (đơn hủy)');

    // Ghi nhận ai quét (Hiến pháp II).
    await this.audit.log({
      userId: user.id,
      orderId: order.id,
      action: 'order.qr.scan',
      objectType: 'order',
      objectId: order.id,
      newValue: { by: user.name },
    });

    const currentStep = this.pickCurrentStep(order.steps);
    return {
      order: {
        id: order.id,
        code: order.code,
        status: order.status,
        statusLabel: ORDER_STATUS_LABELS[order.status as OrderStatus],
        priority: order.priority,
        deadline: order.deadline,
        customer: order.customer,
        items: order.items,
      },
      steps: order.steps,
      currentStep,
    };
  }

  // Resolve token → order (kiểm tra qrActive) cho các action scan, không ghi audit quét.
  async scanLandingResolve(qrToken: string) {
    const order = await this.prisma.order.findUnique({ where: { qrToken } });
    if (!order) throw new NotFoundException('QR không hợp lệ');
    if (!order.qrActive) throw new BadRequestException('QR đã bị vô hiệu hóa (đơn hủy)');
    return order;
  }

  // US3 (008): "Việc của tôi" — công đoạn active đang gán cho user hiện tại.
  async myTasks(user: AuthUser) {
    const steps = await this.prisma.productionStep.findMany({
      where: {
        assignedToId: user.id,
        status: { in: [StepStatus.NOT_STARTED, StepStatus.ACCEPTED, StepStatus.IN_PROGRESS, StepStatus.NEEDS_REWORK] },
        order: { status: { in: [OrderStatus.WAITING_PRODUCTION, OrderStatus.IN_PRODUCTION, OrderStatus.NEEDS_REWORK, OrderStatus.QC_FAILED] } },
      },
      include: {
        order: { select: { id: true, code: true, qrToken: true, status: true, deadline: true, priority: true, customer: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return steps.map((s) => ({
      stepId: s.id,
      stepName: s.stepName,
      status: s.status,
      order: s.order,
    }));
  }

  private pickCurrentStep(steps: { status: string; stepOrder: number }[]) {
    return (
      [...steps]
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .find((s) => s.status !== StepStatus.DONE) ?? null
    );
  }

  private async resolveStep(orderId: string, stepId?: string) {
    if (stepId) {
      const step = await this.prisma.productionStep.findUnique({ where: { id: stepId } });
      if (!step || step.orderId !== orderId)
        throw new NotFoundException('Không tìm thấy công đoạn');
      return step;
    }
    const steps = await this.prisma.productionStep.findMany({ where: { orderId } });
    const current = this.pickCurrentStep(steps);
    if (!current) throw new BadRequestException('Đơn không còn công đoạn cần xử lý');
    return this.prisma.productionStep.findUnique({ where: { id: (current as any).id } }) as any;
  }

  // Cập nhật step có optimistic lock (chống 2 thợ ghi đè — edge case).
  private async lockedUpdate(stepId: string, expectedVersion: number | undefined, data: any) {
    const where: any = { id: stepId };
    if (expectedVersion !== undefined) where.version = expectedVersion;
    const res = await this.prisma.productionStep.updateMany({
      where,
      data: { ...data, version: { increment: 1 } },
    });
    if (res.count === 0) {
      throw new ConflictException(
        'Công đoạn vừa được người khác cập nhật. Vui lòng tải lại.',
      );
    }
    return this.prisma.productionStep.findUnique({ where: { id: stepId } });
  }

  // ─── US6: tiếp nhận / bắt đầu / hoàn thành / báo lỗi ───────────────────────
  async accept(orderId: string, dto: StepTargetDto, user: AuthUser) {
    const step = await this.resolveStep(orderId, dto.stepId);
    if (![StepStatus.NOT_STARTED, StepStatus.NEEDS_REWORK].includes(step.status as StepStatus)) {
      throw new BadRequestException('Công đoạn không ở trạng thái có thể tiếp nhận');
    }
    const updated = await this.lockedUpdate(step.id, dto.expectedVersion ?? step.version, {
      status: StepStatus.ACCEPTED,
      assignedToId: step.assignedToId ?? user.id,
      performedById: user.id, // người quét QR = người thực hiện thực tế (Phase 007)
    });
    await this.afterStepChange(orderId, step.id, 'production.step.accept', user, step.status, StepStatus.ACCEPTED);

    // Phase 013: KL tiếp nhận (tùy chọn) → 1 bản cân "Tiếp nhận – <công đoạn>".
    if (dto.receivedWeight != null) {
      const itemId = dto.orderItemId ?? (await this.prisma.orderItem.findFirst({ where: { orderId }, select: { id: true } }))?.id;
      let prevWeight = dto.receivedWeight;
      if (itemId) {
        const it = await this.prisma.orderItem.findUnique({ where: { id: itemId }, select: { currentWeight: true, initialWeight: true } });
        prevWeight = it?.currentWeight ?? it?.initialWeight ?? dto.receivedWeight;
      }
      await this.weight.create(
        orderId,
        {
          orderItemId: itemId,
          stageName: `Tiếp nhận – ${STEP_LABELS[step.stepName as StepName] ?? step.stepName}`,
          previousWeight: prevWeight,
          currentWeight: dto.receivedWeight,
          confirmNegative: true,
        },
        user,
      );
    }
    return updated;
  }

  async start(orderId: string, dto: StepTargetDto, user: AuthUser) {
    const step = await this.resolveStep(orderId, dto.stepId);
    if (![StepStatus.ACCEPTED, StepStatus.NOT_STARTED, StepStatus.NEEDS_REWORK].includes(step.status as StepStatus)) {
      throw new BadRequestException('Công đoạn không thể bắt đầu');
    }
    const updated = await this.lockedUpdate(step.id, dto.expectedVersion ?? step.version, {
      status: StepStatus.IN_PROGRESS,
      startedAt: step.startedAt ?? new Date(),
      assignedToId: step.assignedToId ?? user.id,
      performedById: user.id, // Phase 007
    });
    // Đơn vào "Đang sản xuất" khi công đoạn đầu bắt đầu.
    await this.maybeSetOrderInProduction(orderId);
    await this.afterStepChange(orderId, step.id, 'production.step.start', user, step.status, StepStatus.IN_PROGRESS);
    return updated;
  }

  async complete(orderId: string, dto: CompleteStepDto, user: AuthUser) {
    const step = await this.resolveStep(orderId, dto.stepId);
    if (step.status !== StepStatus.IN_PROGRESS && step.status !== StepStatus.ACCEPTED) {
      throw new BadRequestException('Chỉ hoàn thành công đoạn đang xử lý');
    }

    // Trọng lượng tại công đoạn → tạo weight_log (tính hao hụt + cảnh báo).
    let weightResult: Awaited<ReturnType<WeightService['create']>> | null = null;
    if (dto.currentWeight != null && dto.previousWeight != null) {
      weightResult = await this.weight.create(
        orderId,
        {
          orderItemId: dto.orderItemId,
          productionStepId: step.id,
          stageName: dto.stageName ?? STEP_LABELS[step.stepName as StepName] ?? step.stepName,
          previousWeight: dto.previousWeight,
          currentWeight: dto.currentWeight,
          confirmNegative: dto.confirmNegative,
          note: dto.note,
        },
        user,
      );
    }

    const updated = await this.lockedUpdate(step.id, dto.expectedVersion ?? step.version, {
      status: StepStatus.DONE,
      completedAt: new Date(),
      completedQuantity: dto.completedQuantity,
      defectQuantity: dto.defectQuantity ?? 0,
      assignedToId: step.assignedToId ?? user.id,
      performedById: user.id, // người HOÀN THÀNH = người được tín công (Phase 007)
    });

    await this.afterStepChange(orderId, step.id, 'production.step.complete', user, step.status, StepStatus.DONE);
    await this.maybeSetOrderInProduction(orderId); // đảm bảo đơn ở "Đang sản xuất"
    await this.advanceOrderAfterComplete(orderId);
    return { step: updated, weight: weightResult };
  }

  async reportIssue(orderId: string, dto: ReportIssueDto, user: AuthUser) {
    const step = await this.resolveStep(orderId, dto.stepId);
    const updated = await this.lockedUpdate(step.id, dto.expectedVersion ?? step.version, {
      status: StepStatus.ISSUE,
      issueNote: dto.note,
      performedById: user.id, // Phase 007
    });
    if (dto.imageUrl) {
      await this.prisma.attachment.create({
        data: {
          objectType: 'production_step',
          objectId: step.id,
          orderId,
          fileUrl: dto.imageUrl,
          fileType: 'image',
          uploadedById: user.id,
        },
      });
    }
    await this.afterStepChange(orderId, step.id, 'production.step.issue', user, step.status, StepStatus.ISSUE);
    // Cảnh báo quản lý realtime
    this.events.emit('production.issue', { orderId, stepId: step.id, by: user.name, note: dto.note });
    return updated;
  }

  // Gán/đổi người phụ trách công đoạn (quản lý).
  async assign(stepId: string, dto: AssignStepDto, user: AuthUser) {
    const step = await this.prisma.productionStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Không tìm thấy công đoạn');
    const updated = await this.prisma.productionStep.update({
      where: { id: stepId },
      data: { assignedToId: dto.assignedToId },
    });
    await this.audit.log({
      userId: user.id,
      orderId: step.orderId,
      action: 'production.step.assign',
      objectType: 'production_step',
      objectId: stepId,
      newValue: { assignedToId: dto.assignedToId },
    });
    return updated;
  }

  // ─── Trạng thái đơn theo tiến độ công đoạn ────────────────────────────────
  private async maybeSetOrderInProduction(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (order && order.status === OrderStatus.WAITING_PRODUCTION) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.IN_PRODUCTION },
      });
      this.events.orderChanged(orderId, OrderStatus.IN_PRODUCTION);
    }
  }

  // Sau khi hoàn thành 1 công đoạn: nếu công đoạn kế là QC → đơn "Chờ QC".
  private async advanceOrderAfterComplete(orderId: string) {
    const steps = await this.prisma.productionStep.findMany({
      where: { orderId },
      orderBy: { stepOrder: 'asc' },
    });
    const next = steps.find((s) => s.status !== StepStatus.DONE);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    if (!next) {
      // Hết công đoạn → hoàn thành sản xuất.
      if (order.status !== OrderStatus.PRODUCTION_DONE) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PRODUCTION_DONE },
        });
        this.events.orderChanged(orderId, OrderStatus.PRODUCTION_DONE);
      }
      return;
    }
    if (next.stepName === StepName.QC && order.status !== OrderStatus.WAITING_QC) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.WAITING_QC },
      });
      this.events.orderChanged(orderId, OrderStatus.WAITING_QC);
    }
  }

  // Phase 011: hệ quả sau khi 1 công đoạn hoàn thành THEO LÔ (dùng bởi BatchesService).
  async finalizeBatchStepCompletion(orderId: string, stepId: string, user: AuthUser, fromStatus: string) {
    await this.afterStepChange(orderId, stepId, 'production.step.complete', user, fromStatus, StepStatus.DONE);
    await this.maybeSetOrderInProduction(orderId);
    await this.advanceOrderAfterComplete(orderId);
  }

  // Công đoạn hiện tại của 1 đơn (public wrapper cho BatchesService).
  async currentStepOfOrder(orderId: string) {
    const steps = await this.prisma.productionStep.findMany({ where: { orderId }, orderBy: { stepOrder: 'asc' } });
    return this.pickCurrentStep(steps) as any;
  }

  private async afterStepChange(
    orderId: string,
    stepId: string,
    action: string,
    user: AuthUser,
    from: string,
    to: string,
  ) {
    await this.audit.log({
      userId: user.id,
      orderId,
      action,
      objectType: 'production_step',
      objectId: stepId,
      oldValue: { status: from },
      newValue: { status: to },
    });
    this.events.stepChanged(orderId, { stepId, status: to });
  }

  // ─── Phase 006: Kanban theo TRẠNG THÁI ĐƠN (cột cấu hình được) ─────────────
  async listColumns(includeHidden = false) {
    return this.prisma.boardColumn.findMany({
      where: includeHidden ? {} : { visible: true },
      orderBy: { position: 'asc' },
    });
  }

  async board(filters: { q?: string }) {
    const columns = await this.listColumns(false);
    const statuses = columns.map((c) => c.status);
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: statuses },
        ...(filters.q
          ? { OR: [{ code: { contains: filters.q, mode: 'insensitive' as const } }, { name: { contains: filters.q, mode: 'insensitive' as const } }, { customer: { name: { contains: filters.q, mode: 'insensitive' as const } } }] }
          : {}),
      },
      include: {
        customer: { select: { name: true } },
        items: { select: { productName: true, imageUrl: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
        weightLogs: { select: { exceedsAllowed: true } },
      },
      orderBy: { deadline: 'asc' },
    });

    const now = Date.now();
    const cards = orders.map((o) => {
      const current = this.pickCurrentStep(o.steps) as any;
      return {
        orderId: o.id,
        code: o.code,
        name: o.name, // tên đơn dễ đọc (Phase 010)
        status: o.status, // cột = trạng thái đơn
        customerName: o.customer.name,
        priority: o.priority,
        deadline: o.deadline,
        overdue: o.deadline ? new Date(o.deadline).getTime() < now : false,
        lossExceeded: o.weightLogs.some((w) => w.exceedsAllowed),
        currentStepLabel: current ? STEP_LABELS[current.stepName as StepName] ?? current.stepName : null,
        item: o.items[0] ?? null,
        itemCount: o.items.length,
      };
    });
    return { columns, cards };
  }

  // Phase 011b: Kanban THEO CÔNG ĐOẠN — mỗi đơn nằm ở cột = công đoạn hiện tại.
  async boardByStep(filters: { q?: string }) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.WAITING_PRODUCTION, OrderStatus.IN_PRODUCTION, OrderStatus.WAITING_QC, OrderStatus.NEEDS_REWORK, OrderStatus.QC_FAILED] },
        steps: { some: {} }, // chỉ đơn đã cấu hình công đoạn
        ...(filters.q
          ? { OR: [{ code: { contains: filters.q, mode: 'insensitive' as const } }, { name: { contains: filters.q, mode: 'insensitive' as const } }, { customer: { name: { contains: filters.q, mode: 'insensitive' as const } } }] }
          : {}),
      },
      include: {
        customer: { select: { name: true } },
        items: { select: { productName: true, imageUrl: true } },
        steps: { orderBy: { stepOrder: 'asc' } },
        weightLogs: { select: { exceedsAllowed: true } },
      },
      orderBy: { deadline: 'asc' },
    });

    const now = Date.now();
    const cards: any[] = [];
    for (const o of orders) {
      const current = this.pickCurrentStep(o.steps) as any;
      if (!current) continue; // hết công đoạn (đã hoàn thành SX) → không hiển thị ở bảng công đoạn
      const doneCount = o.steps.filter((s) => s.status === StepStatus.DONE).length;
      cards.push({
        orderId: o.id,
        code: o.code,
        name: o.name,
        customerName: o.customer.name,
        priority: o.priority,
        deadline: o.deadline,
        overdue: o.deadline ? new Date(o.deadline).getTime() < now : false,
        lossExceeded: o.weightLogs.some((w) => w.exceedsAllowed),
        stepName: current.stepName, // cột = công đoạn hiện tại
        stepId: current.id,
        stepStatus: current.status,
        inBatch: !!current.batchId,
        progress: { done: doneCount, total: o.steps.length },
        item: o.items[0] ?? null,
        itemCount: o.items.length,
      });
    }
    // Cột = toàn bộ quy trình chuẩn (giữ thứ tự), để thấy cả pipeline.
    const columns = DEFAULT_STEP_FLOW.map((s) => ({ stepName: s, label: STEP_LABELS[s] ?? s }));
    return { columns, cards };
  }

  // Cấu hình cột (FR-002): thêm / đổi tên-visible-vị trí / ẩn.
  async addColumn(dto: { status: string; label?: string }, user: AuthUser) {
    if (!ORDER_STATUSES.includes(dto.status as OrderStatus))
      throw new BadRequestException('Trạng thái đơn không hợp lệ');
    const exists = await this.prisma.boardColumn.findUnique({ where: { status: dto.status } });
    if (exists) {
      return this.prisma.boardColumn.update({ where: { status: dto.status }, data: { visible: true } });
    }
    const max = await this.prisma.boardColumn.aggregate({ _max: { position: true } });
    const col = await this.prisma.boardColumn.create({
      data: {
        status: dto.status,
        label: dto.label ?? ORDER_STATUS_LABELS[dto.status as OrderStatus] ?? dto.status,
        position: (max._max.position ?? 0) + 1,
      },
    });
    await this.audit.log({ userId: user.id, action: 'board.column.add', objectType: 'board_column', objectId: col.id, newValue: { status: col.status } });
    return col;
  }

  async updateColumn(id: string, dto: { label?: string; position?: number; visible?: boolean }, user: AuthUser) {
    const col = await this.prisma.boardColumn.findUnique({ where: { id } });
    if (!col) throw new NotFoundException('Không tìm thấy cột');
    const updated = await this.prisma.boardColumn.update({
      where: { id },
      data: { label: dto.label, position: dto.position, visible: dto.visible },
    });
    await this.audit.log({ userId: user.id, action: 'board.column.update', objectType: 'board_column', objectId: id });
    return updated;
  }

  async deleteColumn(id: string, user: AuthUser) {
    const col = await this.prisma.boardColumn.findUnique({ where: { id } });
    if (!col) throw new NotFoundException('Không tìm thấy cột');
    const updated = await this.prisma.boardColumn.update({ where: { id }, data: { visible: false } });
    await this.audit.log({ userId: user.id, action: 'board.column.hide', objectType: 'board_column', objectId: id });
    return updated;
  }

  // Kéo-thả: chuyển nhanh trạng thái công đoạn (quản lý) — PUT step.
  async updateStep(stepId: string, body: { status?: string }, user: AuthUser) {
    const step = await this.prisma.productionStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Không tìm thấy công đoạn');
    const updated = await this.prisma.productionStep.update({
      where: { id: stepId },
      data: { status: body.status ?? step.status, version: { increment: 1 } },
    });
    await this.audit.log({
      userId: user.id,
      orderId: step.orderId,
      action: 'production.step.update',
      objectType: 'production_step',
      objectId: stepId,
      oldValue: { status: step.status },
      newValue: { status: updated.status },
    });
    this.events.stepChanged(step.orderId, { stepId, status: updated.status });
    if (body.status === StepStatus.DONE) await this.advanceOrderAfterComplete(step.orderId);
    return updated;
  }
}
