import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryGroup,
  InventoryTxnType,
  OrderStatus,
  StepName,
  StepStatus,
  stockStatusOf,
} from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';
import { CodesService } from '../common/codes.service';
import { AuditService } from '../common/audit.service';
import { EventsGateway } from '../common/events.gateway';
import { AuthUser } from '../common/decorators';
import {
  IssueDto,
  ReceiptDto,
  StockInFgDto,
  TransferDto,
  UpsertItemDto,
  UpsertSupplierDto,
} from './dto';

const TXN_PREFIX: Record<string, string> = {
  [InventoryTxnType.IN]: 'PN',
  [InventoryTxnType.OUT]: 'PX',
  [InventoryTxnType.TRANSFER]: 'PC',
  [InventoryTxnType.FG_IN]: 'PTP',
};

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private codes: CodesService,
    private audit: AuditService,
    private events: EventsGateway,
  ) {}

  private withStatus<T extends { currentStock: number; minStock: number }>(item: T) {
    return { ...item, stockStatus: stockStatusOf(item.currentStock, item.minStock) };
  }

  // ─── US1: Danh mục vật tư ──────────────────────────────────────────────────
  async listItems(params: {
    q?: string;
    group?: string;
    status?: string;
    supplierId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const where: any = {};
    if (params.group) where.group = params.group;
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.q)
      where.OR = [{ code: { contains: params.q } }, { name: { contains: params.q } }];

    let [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { supplier: { select: { id: true, name: true } } },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);
    let withStatus = items.map((i) => this.withStatus(i));
    // Lọc trạng thái tồn (tính ở app vì là field dẫn xuất).
    if (params.status) withStatus = withStatus.filter((i) => i.stockStatus === params.status);
    return { items: withStatus, total, page, pageSize };
  }

  async getItem(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: { supplier: true },
    });
    if (!item) throw new NotFoundException('Không tìm thấy vật tư');
    return this.withStatus(item);
  }

  async createItem(dto: UpsertItemDto, user: AuthUser) {
    const code = await this.codes.nextMaterialCode();
    const item = await this.prisma.inventoryItem.create({
      data: {
        code,
        name: dto.name,
        group: dto.group,
        category: dto.category,
        unit: dto.unit,
        minStock: dto.minStock ?? 0,
        maxStock: dto.maxStock,
        costPrice: dto.costPrice,
        location: dto.location,
        supplierId: dto.supplierId,
        currentStock: dto.openingStock ?? 0,
      },
    });
    await this.audit.log({
      userId: user.id,
      action: 'inventory.item.create',
      objectType: 'inventory_item',
      objectId: item.id,
      newValue: { code, name: item.name, group: item.group },
    });
    return this.withStatus(item);
  }

  async updateItem(id: string, dto: UpsertItemDto, user: AuthUser) {
    await this.getItem(id);
    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        name: dto.name,
        group: dto.group,
        category: dto.category,
        unit: dto.unit,
        minStock: dto.minStock,
        maxStock: dto.maxStock,
        costPrice: dto.costPrice,
        location: dto.location,
        supplierId: dto.supplierId,
      },
    });
    await this.audit.log({
      userId: user.id,
      action: 'inventory.item.update',
      objectType: 'inventory_item',
      objectId: id,
    });
    return this.withStatus(item);
  }

  // ─── Suppliers ─────────────────────────────────────────────────────────────
  async listSuppliers(q?: string) {
    return this.prisma.supplier.findMany({
      where: q ? { OR: [{ name: { contains: q } }, { code: { contains: q } }] } : {},
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async createSupplier(dto: UpsertSupplierDto, user: AuthUser) {
    const code = await this.codes.nextSupplierCode();
    const sup = await this.prisma.supplier.create({ data: { ...dto, code } });
    await this.audit.log({
      userId: user.id,
      action: 'inventory.supplier.create',
      objectType: 'supplier',
      objectId: sup.id,
      newValue: { code, name: sup.name },
    });
    return sup;
  }

  // ─── US2: Nhập kho ─────────────────────────────────────────────────────────
  async receipt(dto: ReceiptDto, user: AuthUser) {
    const item = await this.getItem(dto.inventoryItemId);
    const code = await this.codes.nextTxnCode(TXN_PREFIX[InventoryTxnType.IN]);

    const [, txn] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentStock: { increment: dto.quantity },
          ...(dto.unitPrice != null ? { costPrice: dto.unitPrice } : {}),
          ...(dto.supplierId ? { supplierId: dto.supplierId } : {}),
        },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          code,
          type: InventoryTxnType.IN,
          inventoryItemId: item.id,
          supplierId: dto.supplierId,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          performedById: user.id,
          note: dto.note,
        },
      }),
    ]);

    if (dto.invoiceUrl) {
      await this.prisma.attachment.create({
        data: {
          objectType: 'inventory_transaction',
          objectId: txn.id,
          fileUrl: dto.invoiceUrl,
          fileType: 'invoice',
          uploadedById: user.id,
        },
      });
    }
    await this.audit.log({
      userId: user.id,
      action: 'inventory.receipt',
      objectType: 'inventory_transaction',
      objectId: txn.id,
      newValue: { item: item.code, quantity: dto.quantity, code },
    });
    return { transaction: txn, item: await this.getItem(item.id) };
  }

  // ─── US3: Xuất kho theo đơn/công đoạn ──────────────────────────────────────
  async issue(dto: IssueDto, user: AuthUser) {
    const item = await this.getItem(dto.inventoryItemId);
    if (!dto.allowNegative && item.currentStock < dto.quantity) {
      throw new BadRequestException(
        `Tồn không đủ: còn ${item.currentStock} ${item.unit ?? ''}, cần ${dto.quantity}`,
      );
    }
    const code = await this.codes.nextTxnCode(TXN_PREFIX[InventoryTxnType.OUT]);
    const [, txn] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: { decrement: dto.quantity } },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          code,
          type: InventoryTxnType.OUT,
          inventoryItemId: item.id,
          orderId: dto.orderId,
          productionStepId: dto.productionStepId,
          quantity: dto.quantity,
          performedById: user.id,
          note: dto.note,
        },
      }),
    ]);
    await this.audit.log({
      userId: user.id,
      orderId: dto.orderId,
      action: 'inventory.issue',
      objectType: 'inventory_transaction',
      objectId: txn.id,
      newValue: { item: item.code, quantity: dto.quantity, orderId: dto.orderId, code },
    });
    return { transaction: txn, item: await this.getItem(item.id) };
  }

  // ─── US6: Chuyển kho (giữa 2 vật tư/nhóm kho) ──────────────────────────────
  async transfer(dto: TransferDto, user: AuthUser) {
    if (dto.fromItemId === dto.toItemId)
      throw new BadRequestException('Không thể chuyển trong cùng một vật tư');
    const from = await this.getItem(dto.fromItemId);
    const to = await this.getItem(dto.toItemId);
    if (from.currentStock < dto.quantity)
      throw new BadRequestException(`Tồn nguồn không đủ: còn ${from.currentStock}`);

    const code = await this.codes.nextTxnCode(TXN_PREFIX[InventoryTxnType.TRANSFER]);
    const [, , txn] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id: from.id },
        data: { currentStock: { decrement: dto.quantity } },
      }),
      this.prisma.inventoryItem.update({
        where: { id: to.id },
        data: { currentStock: { increment: dto.quantity } },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          code,
          type: InventoryTxnType.TRANSFER,
          inventoryItemId: from.id,
          quantity: dto.quantity,
          fromGroup: from.group,
          toGroup: to.group,
          performedById: user.id,
          note: dto.note ? `${dto.note} → ${to.code}` : `Chuyển sang ${to.code}`,
        },
      }),
    ]);
    await this.audit.log({
      userId: user.id,
      action: 'inventory.transfer',
      objectType: 'inventory_transaction',
      objectId: txn.id,
      newValue: { from: from.code, to: to.code, quantity: dto.quantity, code },
    });
    return { transaction: txn, from: await this.getItem(from.id), to: await this.getItem(to.id) };
  }

  // ─── US4: Nhập kho thành phẩm sau QC PASS ──────────────────────────────────
  async pendingFinishedGoods() {
    // Đơn đã QC PASS (PRODUCTION_DONE) chờ nhập kho TP.
    return this.prisma.order.findMany({
      where: { status: OrderStatus.PRODUCTION_DONE },
      orderBy: { updatedAt: 'desc' },
      include: { customer: { select: { name: true } }, items: true },
    });
  }

  async stockInFinishedGoods(dto: StockInFgDto, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true, steps: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn');
    if (order.status !== OrderStatus.PRODUCTION_DONE)
      throw new BadRequestException('Chỉ nhập kho TP cho đơn đã QC PASS (Hoàn thành sản xuất)');

    const totalQty = order.items.reduce((s, it) => s + (it.quantity ?? 1), 0);
    const name = order.items.map((it) => it.productName).join(', ');
    const code = await this.codes.nextMaterialCode();

    // Tạo vật tư thành phẩm cho đơn này.
    const fgItem = await this.prisma.inventoryItem.create({
      data: {
        code,
        name: `TP: ${name}`,
        group: InventoryGroup.FINISHED,
        unit: 'cái',
        currentStock: totalQty,
        minStock: 0,
        costPrice: dto.unitCost,
        location: dto.location,
      },
    });
    const txnCode = await this.codes.nextTxnCode(TXN_PREFIX[InventoryTxnType.FG_IN]);
    const txn = await this.prisma.inventoryTransaction.create({
      data: {
        code: txnCode,
        type: InventoryTxnType.FG_IN,
        inventoryItemId: fgItem.id,
        orderId: order.id,
        quantity: totalQty,
        unitPrice: dto.unitCost,
        performedById: user.id,
        note: dto.note,
      },
    });

    // Đánh dấu công đoạn Nhập kho TP hoàn thành (nếu có) + đơn → STOCKED.
    const stockStep = order.steps.find((s) => s.stepName === StepName.STOCK_IN);
    await this.prisma.$transaction([
      ...(stockStep
        ? [
            this.prisma.productionStep.update({
              where: { id: stockStep.id },
              data: { status: StepStatus.DONE, completedAt: new Date() },
            }),
          ]
        : []),
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.STOCKED },
      }),
    ]);

    await this.audit.log({
      userId: user.id,
      orderId: order.id,
      action: 'inventory.fg.stock-in',
      objectType: 'order',
      objectId: order.id,
      oldValue: { status: OrderStatus.PRODUCTION_DONE },
      newValue: { status: OrderStatus.STOCKED, fgItem: fgItem.code, quantity: totalQty },
    });
    this.events.orderChanged(order.id, OrderStatus.STOCKED);
    return { transaction: txn, item: this.withStatus(fgItem) };
  }

  // ─── US5: Cảnh báo tồn tối thiểu ──────────────────────────────────────────
  async alerts() {
    const items = await this.prisma.inventoryItem.findMany({
      where: { group: { not: InventoryGroup.FINISHED } },
      orderBy: { currentStock: 'asc' },
    });
    return items
      .map((i) => this.withStatus(i))
      .filter((i) => i.stockStatus !== 'NORMAL');
  }

  // ─── US7: Định giá tồn kho ────────────────────────────────────────────────
  async valuation() {
    const items = await this.prisma.inventoryItem.findMany();
    const byGroup: Record<string, { group: string; value: number; count: number }> = {};
    let total = 0;
    for (const i of items) {
      const value = (i.currentStock ?? 0) * (i.costPrice ?? 0);
      total += value;
      const g = i.group ?? 'OTHER';
      byGroup[g] = byGroup[g] ?? { group: g, value: 0, count: 0 };
      byGroup[g].value += value;
      byGroup[g].count += 1;
    }
    return { total, byGroup: Object.values(byGroup) };
  }

  async summary() {
    const [valuation, alerts, txToday] = await Promise.all([
      this.valuation(),
      this.alerts(),
      this.todayTxnCounts(),
    ]);
    return {
      totalValue: valuation.total,
      byGroup: valuation.byGroup,
      alertCount: alerts.length,
      alerts: alerts.slice(0, 8),
      today: txToday,
    };
  }

  private async todayTxnCounts() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [inCount, outCount] = await Promise.all([
      this.prisma.inventoryTransaction.count({
        where: { createdAt: { gte: start }, type: { in: [InventoryTxnType.IN, InventoryTxnType.FG_IN] } },
      }),
      this.prisma.inventoryTransaction.count({
        where: { createdAt: { gte: start }, type: InventoryTxnType.OUT },
      }),
    ]);
    return { in: inCount, out: outCount };
  }

  // ─── Lịch sử giao dịch (immutable) ─────────────────────────────────────────
  async listTransactions(params: { inventoryItemId?: string; orderId?: string; type?: string; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 30, 100);
    const where: any = {};
    if (params.inventoryItemId) where.inventoryItemId = params.inventoryItemId;
    if (params.orderId) where.orderId = params.orderId;
    if (params.type) where.type = params.type;
    const [items, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          inventoryItem: { select: { code: true, name: true, unit: true } },
          supplier: { select: { name: true } },
          performedBy: { select: { name: true } },
        },
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
