import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StepTargetDto {
  // Nếu không truyền stepId → thao tác trên công đoạn hiện tại của đơn.
  @IsOptional() @IsString() stepId?: string;
  // optimistic lock: client gửi version đang thấy để chống ghi đè (FR edge).
  @IsOptional() @IsInt() expectedVersion?: number;
  // Phase 013: KL tiếp nhận (tùy chọn) — ghi 1 bản cân "Tiếp nhận" khi accept.
  @IsOptional() @IsNumber() receivedWeight?: number;
  @IsOptional() @IsString() orderItemId?: string;
}

export class CompleteStepDto extends StepTargetDto {
  @IsOptional() @IsInt() @Min(0) completedQuantity?: number;
  @IsOptional() @IsInt() @Min(0) defectQuantity?: number;
  // Trọng lượng tại công đoạn (tùy chọn) → tạo weight_log tích hợp.
  @IsOptional() @IsString() stageName?: string;
  @IsOptional() @IsNumber() previousWeight?: number;
  @IsOptional() @IsNumber() currentWeight?: number;
  // orderItemId kế thừa từ StepTargetDto (Phase 013)
  @IsOptional() confirmNegative?: boolean;
  @IsOptional() @IsString() note?: string;
}

export class ReportIssueDto extends StepTargetDto {
  @IsString() note!: string;
  @IsOptional() @IsString() imageUrl?: string;
}

export class AssignStepDto {
  @IsString() assignedToId!: string;
}

// ─── Lô sản xuất (Phase 011) ────────────────────────────────────────────────
export class CreateBatchDto {
  @IsString() stepName!: string; // CASTING | PLATING | ...
  @IsOptional() @IsString() note?: string;
}

export class AddBatchMemberDto {
  // Thêm thành viên bằng 1 trong 3: quét QR đơn, chọn đơn, hoặc chỉ định step.
  @IsOptional() @IsString() qrToken?: string;
  @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsString() stepId?: string;
}

export class RemoveBatchMemberDto {
  @IsString() stepId!: string;
}

export class BatchOverrideDto {
  @IsString() stepId!: string;
  @IsNumber() lossWeight!: number; // hao hụt nhập tay (g) cho đơn cá biệt
}

export class CloseBatchDto {
  @IsNumber() totalOutputWeight!: number; // cân tổng cả lô sau công đoạn (g)
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BatchOverrideDto)
  overrides?: BatchOverrideDto[];
  @IsOptional() confirmNegative?: boolean; // xác nhận tăng cân (vd xi mạ) / hao hụt âm
  @IsOptional() @IsString() note?: string;
}
