import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CodesService } from '../common/codes.service';
import { AuditService } from '../common/audit.service';
import { AuthUser } from '../common/decorators';

interface UpsertInput {
  name: string;
  phone?: string;
  address?: string;
  channel?: string;
  customerType?: string;
  note?: string;
}

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private codes: CodesService,
    private audit: AuditService,
  ) {}

  async list(q?: string, page = 1, pageSize = 20) {
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { phone: { contains: q, mode: 'insensitive' as const } },
            { code: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { orders: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async detail(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!customer) throw new NotFoundException('Không tìm thấy khách hàng');
    return customer;
  }

  async orders(id: string) {
    await this.detail(id);
    return this.prisma.order.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async create(dto: UpsertInput, user: AuthUser) {
    const code = await this.codes.nextCustomerCode();
    const customer = await this.prisma.customer.create({ data: { ...dto, code } });
    await this.audit.log({
      userId: user.id,
      action: 'customer.create',
      objectType: 'customer',
      objectId: customer.id,
      newValue: { code, name: customer.name },
    });
    return customer;
  }

  async update(id: string, dto: UpsertInput, user: AuthUser) {
    const before = await this.detail(id);
    const customer = await this.prisma.customer.update({ where: { id }, data: dto });
    await this.audit.log({
      userId: user.id,
      action: 'customer.update',
      objectType: 'customer',
      objectId: id,
      oldValue: { name: before.name, phone: before.phone },
      newValue: { name: customer.name, phone: customer.phone },
    });
    return customer;
  }
}
