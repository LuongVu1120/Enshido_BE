import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { QCResult } from '@enshido/types';

export class QCPassDto {
  @IsOptional() @IsString() orderItemId?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() checklist?: string; // JSON string [{key,value}] (tránh ValidationPipe strip)
}

export class QCFailDto {
  @IsOptional() @IsString() orderItemId?: string;
  @IsIn([QCResult.FAIL, QCResult.NEEDS_REWORK]) result!: string;
  @IsString() defectType!: string; // tên lỗi ngắn (Phase 012)
  @IsOptional() @IsString() severity?: string; // DefectSeverity (Phase 012: tùy chọn)
  @IsOptional() @IsString() returnStepId?: string; // công đoạn trả về (Phase 012: tùy chọn — server tự chọn nếu thiếu)
  @IsOptional() @IsString() assignedReworkUserId?: string;
  @IsOptional() @IsString() reworkDeadline?: string; // ISO
  @IsOptional() @IsArray() imageUrls?: string[];
  @IsOptional() @IsString() checklist?: string; // JSON string
  @IsOptional() @IsString() note?: string; // mô tả rich text (sanitize ở service)
}
