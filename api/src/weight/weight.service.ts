import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { calcLoss, DEFAULT_ALLOWED_LOSS_PERCENT } from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { AuthUser } from '../common/decorators';
import { CreateWeightLogDto } from './dto';

@Injectable()
export class WeightService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
  ) {}

  async list(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn');
    return this.prisma.weightLog.findMany({
      where: { orderId },
      orderBy: { measuredAt: 'asc' },
      include: { measuredBy: { select: { id: true, name: true } } },
    });
  }

  // FR-010/FR-011 — lưu cân & tự tính hao hụt; cảnh báo vượt định mức.
  async create(orderId: string, dto: CreateWeightLogDto, user: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn');

    // Mốc lũy kế = TL ban đầu của sản phẩm; nếu thiếu, dùng previousWeight lần đầu.
    let initialWeight = dto.previousWeight;
    if (dto.orderItemId) {
      const item = await this.prisma.orderItem.findUnique({ where: { id: dto.orderItemId } });
      if (item?.initialWeight != null) initialWeight = item.initialWeight;
    }

    const envAllowed = Number(this.config.get('DEFAULT_ALLOWED_LOSS_PERCENT'));
    const allowedLossPercent =
      dto.allowedLossPercent ??
      (Number.isFinite(envAllowed) ? envAllowed : DEFAULT_ALLOWED_LOSS_PERCENT);

    const calc = calcLoss({
      previousWeight: dto.previousWeight,
      currentWeight: dto.currentWeight,
      initialWeight,
      allowedLossPercent,
    });

    // Edge case: hao hụt âm → yêu cầu xác nhận (nghi nhập sai).
    if (calc.isNegative && !dto.confirmNegative) {
      throw new BadRequestException({
        code: 'NEGATIVE_LOSS',
        message: 'Trọng lượng sau lớn hơn trước (hao hụt âm). Vui lòng kiểm tra & xác nhận.',
        calc,
      });
    }

    // Bản ghi cân BẤT BIẾN (Hiến pháp III) — chỉ create, không update.
    const log = await this.prisma.weightLog.create({
      data: {
        orderId,
        orderItemId: dto.orderItemId,
        productionStepId: dto.productionStepId,
        stageName: dto.stageName,
        previousWeight: dto.previousWeight,
        currentWeight: dto.currentWeight,
        lossWeight: calc.lossWeight,
        lossPercent: calc.lossPercent,
        cumulativeLossWeight: calc.cumulativeLossWeight,
        cumulativeLossPercent: calc.cumulativeLossPercent,
        allowedLossPercent,
        exceedsAllowed: calc.exceedsAllowed,
        // Phase 012: người cân theo lựa chọn (mặc định người thao tác). Audit vẫn ghi user.id.
        measuredById: dto.measuredById || user.id,
        note: dto.note,
      },
    });

    // Cập nhật TL hiện tại của sản phẩm + công đoạn (để Kanban/phiếu hiển thị).
    if (dto.orderItemId) {
      await this.prisma.orderItem.update({
        where: { id: dto.orderItemId },
        data: { currentWeight: dto.currentWeight },
      });
    }
    if (dto.productionStepId) {
      await this.prisma.productionStep.update({
        where: { id: dto.productionStepId },
        data: {
          inputWeight: dto.previousWeight,
          outputWeight: dto.currentWeight,
          lossWeight: calc.lossWeight,
          lossPercent: calc.lossPercent,
        },
      });
    }

    await this.audit.log({
      userId: user.id,
      orderId,
      action: 'weight.create',
      objectType: 'weight_log',
      objectId: log.id,
      newValue: {
        stage: dto.stageName,
        previousWeight: dto.previousWeight,
        currentWeight: dto.currentWeight,
        lossWeight: calc.lossWeight,
        lossPercent: calc.lossPercent,
        exceedsAllowed: calc.exceedsAllowed,
      },
    });

    // Cảnh báo vượt định mức: công đoạn + người thực hiện + chênh lệch (FR-011).
    const warning = calc.exceedsAllowed
      ? {
          message: `Hao hụt lũy kế ${calc.cumulativeLossPercent}% vượt định mức ${allowedLossPercent}%`,
          stage: dto.stageName,
          by: user.name,
          excessPercent: calc.cumulativeLossPercent - allowedLossPercent,
        }
      : null;

    return { weightLog: log, calc, warning };
  }
}
