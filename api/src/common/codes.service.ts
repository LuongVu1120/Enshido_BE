import { Injectable } from '@nestjs/common';
import { CODE_PREFIX } from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';

// Sinh mã theo quy ước (Additional Constraints):
//   SX-YYYYMMDD-#### (đơn) · PSX-YYYYMMDD-#### (phiếu) · KH-###### (khách) · VT-###### (vật tư)
@Injectable()
export class CodesService {
  constructor(private prisma: PrismaService) {}

  private ymd(d = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  private pad(n: number, len: number): string {
    return String(n).padStart(len, '0');
  }

  // SX-YYYYMMDD-#### : số thứ tự reset theo ngày.
  async nextOrderCode(): Promise<string> {
    const ymd = this.ymd();
    const prefix = `${CODE_PREFIX.ORDER}-${ymd}-`;
    const count = await this.prisma.order.count({ where: { code: { startsWith: prefix } } });
    return `${prefix}${this.pad(count + 1, 4)}`;
  }

  // PSX-YYYYMMDD-#### : phiếu sản xuất.
  async nextTicketCode(): Promise<string> {
    const ymd = this.ymd();
    const prefix = `${CODE_PREFIX.TICKET}-${ymd}-`;
    const count = await this.prisma.order.count({ where: { ticketCode: { startsWith: prefix } } });
    return `${prefix}${this.pad(count + 1, 4)}`;
  }

  // KH-###### : khách hàng (chuỗi tăng dần toàn cục).
  async nextCustomerCode(): Promise<string> {
    const count = await this.prisma.customer.count();
    return `${CODE_PREFIX.CUSTOMER}-${this.pad(count + 1, 6)}`;
  }

  // VT-###### : vật tư.
  async nextMaterialCode(): Promise<string> {
    const count = await this.prisma.inventoryItem.count();
    return `${CODE_PREFIX.MATERIAL}-${this.pad(count + 1, 6)}`;
  }

  // NCC-###### : nhà cung cấp.
  async nextSupplierCode(): Promise<string> {
    const count = await this.prisma.supplier.count();
    return `${CODE_PREFIX.SUPPLIER}-${this.pad(count + 1, 6)}`;
  }

  // NV-#### : nhân viên (Phase 004).
  async nextEmployeeCode(): Promise<string> {
    const count = await this.prisma.employee.count();
    return `${CODE_PREFIX.EMPLOYEE}-${this.pad(count + 1, 4)}`;
  }

  // LSX-YYYYMMDD-#### : lô sản xuất (Phase 011).
  async nextBatchCode(): Promise<string> {
    const ymd = this.ymd();
    const prefix = `${CODE_PREFIX.BATCH}-${ymd}-`;
    const count = await this.prisma.productionBatch.count({ where: { code: { startsWith: prefix } } });
    return `${prefix}${this.pad(count + 1, 4)}`;
  }

  // Mã giao dịch kho: <PREFIX>-YYYYMMDD-#### (PN nhập, PX xuất, PC chuyển, PTP nhập TP).
  async nextTxnCode(prefix: string): Promise<string> {
    const ymd = this.ymd();
    const full = `${prefix}-${ymd}-`;
    const count = await this.prisma.inventoryTransaction.count({
      where: { code: { startsWith: full } },
    });
    return `${full}${this.pad(count + 1, 4)}`;
  }
}
