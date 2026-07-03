import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateWeightLogDto {
  @IsOptional() @IsString() orderItemId?: string;
  @IsOptional() @IsString() productionStepId?: string;
  @IsString() stageName!: string;
  @IsOptional() @IsString() measuredById?: string; // người cân (Phase 012) — mặc định user hiện tại
  @IsNumber() @Min(0) previousWeight!: number;
  @IsNumber() @Min(0) currentWeight!: number;
  @IsOptional() @IsNumber() allowedLossPercent?: number;
  @IsOptional() @IsString() note?: string;
  // Xác nhận khi hao hụt âm (TL sau > trước) — edge case nhập sai.
  @IsOptional() @IsBoolean() confirmNegative?: boolean;
}
