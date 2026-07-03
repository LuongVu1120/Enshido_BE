import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DEFAULT_STEP_FLOW,
  EDITABLE_ORDER_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  OrderStatus,
  StepName,
  StepStatus,
} from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';
import { CodesService } from '../common/codes.service';
import { AuditService } from '../common/audit.service';
import { EventsGateway } from '../common/events.gateway';
import { AuthUser } from '../common/decorators';
import { sanitizeRichText } from '../common/sanitize.util';
import {
  ChangeStatusDto,
  ConfigureStepsDto,
  CreateOrderDto,
  UpdateOrderDto,
} from './dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private codes: CodesService,
    private audit: AuditService,
    private events: EventsGateway,
  ) {}

  // ─── Tạo đơn + sản phẩm (FR-004) ──────────────────────────────────────────
  async create(dto: CreateOrderDto, user: AuthUser) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new BadRequestException('Khách hàng không tồn tại');
    if (!dto.items?.length) throw new BadRequestException('Đơn phải có ít nhất 1 sản phẩm');

    const code = await this.codes.nextOrderCode();
    const order = await this.prisma.order.create({
      data: {
        code,
        name: dto.name?.trim() || null,
        customerId: dto.customerId,
        salesChannel: dto.salesChannel,
        orderType: dto.orderType ?? 'MADE_TO_ORDER',
        priority: dto.priority ?? 'NORMAL',
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        note: sanitizeRichText(dto.note),
        status: OrderStatus.WAITING_PRODUCTION,
        createdById: user.id,
        qrToken: randomUUID(),
        items: {
          create: dto.items.map((it) => ({
            productName: it.productName,
            productCode: it.productCode,
            category: it.category,
            quantity: it.quantity ?? 1,
            material: it.material,
            stoneType: it.stoneType,
            stoneSize: it.stoneSize,
            size: it.size,
            platingColor: it.platingColor,
            imageUrl: it.imageUrl,
            technicalNote: it.technicalNote,
            initialWeight: it.initialWeight,
            currentWeight: it.initialWeight,
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.log({
      userId: user.id,
      orderId: order.id,
      action: 'order.create',
      objectType: 'order',
      objectId: order.id,
      newValue: { code, status: order.status },
    });
    return order;
  }

  // ─── Danh sách (lọc/tìm/phân trang) (FR-004/SC-007) ───────────────────────
  async list(params: {
    q?: string;
    status?: string;
    channel?: string;
    priority?: string;
    lateOnly?: boolean;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 5000);
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.channel) where.salesChannel = params.channel;
    if (params.priority) where.priority = params.priority;
    if (params.lateOnly) {
      where.deadline = { lt: new Date() };
      where.status = {
        in: [
          OrderStatus.WAITING_PRODUCTION,
          OrderStatus.IN_PRODUCTION,
          OrderStatus.WAITING_QC,
          OrderStatus.NEEDS_REWORK,
        ],
      };
    }
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }
    if (params.q) {
      where.OR = [
        { code: { contains: params.q } },
        { name: { contains: params.q } },
        { customer: { name: { contains: params.q } } },
        { items: { some: { productName: { contains: params.q } } } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, code: true, name: true } },
          items: { select: { id: true, productName: true, quantity: true, imageUrl: true } },
          _count: { select: { steps: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async detail(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        items: true,
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: {
            assignedTo: { select: { id: true, name: true } },
            performedBy: { select: { id: true, name: true } },
            batch: { select: { id: true, code: true, status: true } },
          },
        },
        qcRecords: {
          orderBy: { createdAt: 'desc' },
          include: { qcUser: { select: { id: true, name: true } } },
        },
        weightLogs: {
          orderBy: { measuredAt: 'asc' },
          include: { measuredBy: { select: { id: true, name: true } } },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }

  async update(id: string, dto: UpdateOrderDto, user: AuthUser) {
    const order = await this.detail(id);
    if (!EDITABLE_ORDER_STATUSES.includes(order.status as OrderStatus)) {
      throw new BadRequestException('Đơn đã vào sản xuất, không thể sửa thông tin chính');
    }
    await this.prisma.order.update({
      where: { id },
      data: {
        name: dto.name === undefined ? undefined : dto.name.trim() || null,
        salesChannel: dto.salesChannel,
        orderType: dto.orderType,
        priority: dto.priority,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        note: dto.note === undefined ? undefined : (sanitizeRichText(dto.note) ?? null),
      },
    });

    // Đồng bộ sản phẩm nếu có (Phase 006): xóa item không còn, sửa item có id, thêm item mới.
    if (dto.items) {
      if (dto.items.length === 0) throw new BadRequestException('Đơn phải có ít nhất 1 sản phẩm');
      const keepIds = dto.items.filter((it) => it.id).map((it) => it.id!) as string[];
      await this.prisma.orderItem.deleteMany({
        where: { orderId: id, id: { notIn: keepIds.length ? keepIds : ['__none__'] } },
      });
      for (const it of dto.items) {
        const data = {
          productName: it.productName,
          productCode: it.productCode,
          category: it.category,
          quantity: it.quantity ?? 1,
          material: it.material,
          stoneType: it.stoneType,
          stoneSize: it.stoneSize,
          size: it.size,
          platingColor: it.platingColor,
          imageUrl: it.imageUrl,
          technicalNote: it.technicalNote,
          initialWeight: it.initialWeight,
        };
        if (it.id) {
          await this.prisma.orderItem.update({ where: { id: it.id }, data });
        } else {
          await this.prisma.orderItem.create({ data: { ...data, orderId: id, currentWeight: it.initialWeight } });
        }
      }
    }

    await this.audit.log({
      userId: user.id,
      orderId: id,
      action: 'order.update',
      objectType: 'order',
      objectId: id,
      newValue: dto.items ? { itemsCount: dto.items.length } : undefined,
    });
    return this.detail(id);
  }

  // Xuất CSV danh sách đơn theo bộ lọc (Phase 006 US3).
  async exportCsv(params: { q?: string; status?: string; channel?: string; from?: string; to?: string }) {
    const { items } = await this.list({ ...params, page: 1, pageSize: 5000 });
    const header = ['Mã đơn', 'Khách hàng', 'Kênh', 'Ưu tiên', 'Trạng thái', 'Deadline', 'Số SP', 'Ngày tạo'];
    const rows = items.map((o: any) => [
      o.code,
      o.customer?.name ?? '',
      o.salesChannel ?? '',
      o.priority,
      o.status,
      o.deadline ? new Date(o.deadline).toLocaleDateString('vi-VN') : '',
      o.items?.length ?? 0,
      new Date(o.createdAt).toLocaleDateString('vi-VN'),
    ]);
    return (
      '﻿' +
      [header, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    );
  }

  // ─── State machine trạng thái (FR-005) ────────────────────────────────────
  async changeStatus(id: string, dto: ChangeStatusDto, user: AuthUser) {
    const order = await this.detail(id);
    const from = order.status as OrderStatus;
    const to = dto.status as OrderStatus;
    if (!ORDER_STATUS_TRANSITIONS[from]?.includes(to)) {
      throw new BadRequestException(`Không thể chuyển trạng thái ${from} → ${to}`);
    }
    const updated = await this.prisma.order.update({ where: { id }, data: { status: to } });
    await this.audit.log({
      userId: user.id,
      orderId: id,
      action: 'order.status.change',
      objectType: 'order',
      objectId: id,
      oldValue: { status: from },
      newValue: { status: to },
    });
    this.events.orderChanged(id, to);
    return updated;
  }

  async cancel(id: string, user: AuthUser) {
    const order = await this.detail(id);
    if (order.status === OrderStatus.CANCELLED)
      throw new BadRequestException('Đơn đã hủy');
    const updated = await this.prisma.order.update({
      where: { id },
      // Vô hiệu hóa QR khi hủy (FR-008)
      data: { status: OrderStatus.CANCELLED, qrActive: false },
    });
    await this.audit.log({
      userId: user.id,
      orderId: id,
      action: 'order.cancel',
      objectType: 'order',
      objectId: id,
      oldValue: { status: order.status, qrActive: true },
      newValue: { status: OrderStatus.CANCELLED, qrActive: false },
    });
    this.events.orderChanged(id, OrderStatus.CANCELLED);
    return updated;
  }

  // ─── Cấu hình công đoạn cho đơn (FR-006/US4) ──────────────────────────────
  async configureSteps(id: string, dto: ConfigureStepsDto, user: AuthUser) {
    const order = await this.detail(id);
    const selected = dto.steps?.length
      ? dto.steps
      : DEFAULT_STEP_FLOW.map((s) => ({ stepName: s, assignedToId: undefined }));

    // Sắp xếp theo thứ tự chuẩn của quy trình, giữ subset đã chọn.
    const ordered = [...selected].sort(
      (a, b) =>
        DEFAULT_STEP_FLOW.indexOf(a.stepName as StepName) -
        DEFAULT_STEP_FLOW.indexOf(b.stepName as StepName),
    );

    await this.prisma.$transaction([
      this.prisma.productionStep.deleteMany({ where: { orderId: id } }),
      ...ordered.map((s, idx) =>
        this.prisma.productionStep.create({
          data: {
            orderId: id,
            stepName: s.stepName,
            stepOrder: idx + 1,
            assignedToId: s.assignedToId || null,
            status: StepStatus.NOT_STARTED,
          },
        }),
      ),
    ]);

    await this.audit.log({
      userId: user.id,
      orderId: id,
      action: 'order.steps.configure',
      objectType: 'order',
      objectId: id,
      newValue: { steps: ordered.map((s) => s.stepName) },
    });
    return this.detail(id);
  }

  // ─── Timeline (audit của đơn) ─────────────────────────────────────────────
  async timeline(id: string) {
    await this.detail(id);
    return this.prisma.activityLog.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });
  }
}
