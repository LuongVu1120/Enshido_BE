import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpsertItemDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() group?: string; // InventoryGroup
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() @Min(0) minStock?: number;
  @IsOptional() @IsNumber() @Min(0) maxStock?: number;
  @IsOptional() @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsNumber() @Min(0) openingStock?: number; // tồn ban đầu khi tạo
}

export class UpsertSupplierDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() note?: string;
}

export class ReceiptDto {
  @IsString() inventoryItemId!: string;
  @IsNumber() @Min(0.0001) quantity!: number;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsNumber() @Min(0) unitPrice?: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() invoiceUrl?: string; // đính kèm hóa đơn
}

export class IssueDto {
  @IsString() inventoryItemId!: string;
  @IsNumber() @Min(0.0001) quantity!: number;
  @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsString() productionStepId?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() allowNegative?: boolean; // cấu hình cho phép âm tồn
}

export class TransferDto {
  @IsString() fromItemId!: string;
  @IsString() toItemId!: string;
  @IsNumber() @Min(0.0001) quantity!: number;
  @IsOptional() @IsString() note?: string;
}

export class StockInFgDto {
  @IsString() orderId!: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsNumber() @Min(0) unitCost?: number;
  @IsOptional() @IsString() note?: string;
}
