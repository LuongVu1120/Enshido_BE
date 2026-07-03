import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { OrderStatus } from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';
import { CodesService } from '../common/codes.service';
import { AuditService } from '../common/audit.service';
import { AuthUser } from '../common/decorators';
import { getPublicWebOrigin } from '../common/network.util';

// US5 — Phiếu sản xuất + QR. QR chứa TOKEN (không nhúng dữ liệu nhạy cảm — FR-008).
@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private codes: CodesService,
    private audit: AuditService,
    private config: ConfigService,
  ) {}

  async printTicket(orderId: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: true,
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });
    if (!order) throw new BadRequestException('Không tìm thấy đơn');
    if (order.status === OrderStatus.CANCELLED)
      throw new BadRequestException('Đơn đã hủy — không in phiếu');

    // In lại nhiều lần → giữ nguyên ticketCode & qrToken cho cùng đơn (edge case).
    let ticketCode = order.ticketCode;
    if (!ticketCode) {
      ticketCode = await this.codes.nextTicketCode();
      await this.prisma.order.update({ where: { id: orderId }, data: { ticketCode } });
    }

    // Phase 013: dùng IP LAN (dev) / PUBLIC_WEB_ORIGIN để quét được từ điện thoại/app ngoài.
    const webOrigin = getPublicWebOrigin(this.config);
    const scanUrl = `${webOrigin}/scan/${order.qrToken}`;
    const qrDataUrl = await QRCode.toDataURL(scanUrl, { width: 240, margin: 1 });

    await this.audit.log({
      userId: user.id,
      orderId,
      action: 'order.ticket.print',
      objectType: 'order',
      objectId: orderId,
      newValue: { ticketCode },
    });

    return {
      ticketCode,
      qrToken: order.qrToken,
      qrActive: order.qrActive,
      scanUrl,
      qrDataUrl,
      order: {
        code: order.code,
        name: order.name,
        status: order.status,
        priority: order.priority,
        deadline: order.deadline,
        salesChannel: order.salesChannel,
        customer: { code: order.customer.code, name: order.customer.name },
        items: order.items,
        steps: order.steps.map((s) => ({
          stepName: s.stepName,
          stepOrder: s.stepOrder,
          status: s.status,
        })),
      },
    };
  }
}
