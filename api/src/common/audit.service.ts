import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  orderId?: string | null;
  action: string; // vd 'order.status.change', 'weight.create', 'qc.fail'
  objectType: string; // 'order' | 'production_step' | 'weight_log' | 'qc_record' | 'user'
  objectId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

// Nhật ký append-only (Hiến pháp II). CHỈ tạo, không bao giờ update/delete.
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        userId: entry.userId ?? null,
        orderId: entry.orderId ?? null,
        action: entry.action,
        objectType: entry.objectType,
        objectId: entry.objectId ?? null,
        oldValue: entry.oldValue !== undefined ? JSON.stringify(entry.oldValue) : null,
        newValue: entry.newValue !== undefined ? JSON.stringify(entry.newValue) : null,
      },
    });
  }
}
