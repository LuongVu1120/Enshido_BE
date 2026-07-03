import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertEmployeeDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() role?: string; // vai trò tài khoản (Phase 007) — mặc định WORKER
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsString() joinDate?: string; // ISO
  @IsOptional() @IsString() status?: string; // EmployeeStatus
  @IsOptional() @IsString() skills?: string;
  @IsOptional() @IsString() note?: string;
}

export class LinkUserDto {
  @IsString() userId!: string;
}
