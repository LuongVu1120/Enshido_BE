import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsOptional() @IsString() id?: string; // có id = sửa item hiện có; không có = thêm mới
  @IsString() @MinLength(1) productName!: string;
  @IsOptional() @IsString() productCode?: string;
  @IsOptional() @IsString() category?: string;
  @IsInt() @Min(1) quantity = 1;
  @IsOptional() @IsString() material?: string;
  @IsOptional() @IsString() stoneType?: string;
  @IsOptional() @IsString() stoneSize?: string;
  @IsOptional() @IsString() size?: string;
  @IsOptional() @IsString() platingColor?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() technicalNote?: string;
  @IsOptional() initialWeight?: number;
}

export class CreateOrderDto {
  @IsString() customerId!: string;
  @IsOptional() @IsString() name?: string; // tên đơn dễ đọc (Phase 010)
  @IsOptional() @IsString() salesChannel?: string;
  @IsOptional() @IsString() orderType?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() deadline?: string; // ISO
  @IsOptional() @IsString() note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

export class UpdateOrderDto {
  @IsOptional() @IsString() name?: string; // tên đơn dễ đọc (Phase 010)
  @IsOptional() @IsString() salesChannel?: string;
  @IsOptional() @IsString() orderType?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() deadline?: string;
  @IsOptional() @IsString() note?: string;

  // Đồng bộ sản phẩm (thêm/sửa/xóa) khi đơn còn cho sửa — Phase 006.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];
}

export class ChangeStatusDto {
  @IsString() status!: string;
}

export class StepConfigDto {
  @IsString() stepName!: string;
  @IsOptional() @IsString() assignedToId?: string;
}

export class ConfigureStepsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepConfigDto)
  steps!: StepConfigDto[];
}
