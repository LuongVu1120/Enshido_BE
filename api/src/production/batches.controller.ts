import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@enshido/types';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { BatchesService } from './batches.service';
import { AddBatchMemberDto, CloseBatchDto, CreateBatchDto, RemoveBatchMemberDto } from './dto';

// Lô sản xuất (Phase 011): thợ + quản lý vận hành; admin full quyền.
const BATCH_ROLES = [Role.WORKER, Role.PRODUCTION_MANAGER];

@ApiTags('production-batches')
@Controller('production/batches')
export class BatchesController {
  constructor(private batches: BatchesService) {}

  // Cấu hình công đoạn chạy theo lô (route tĩnh — khai báo trước :id).
  @Get('config')
  @Roles(...BATCH_ROLES)
  getConfig() {
    return this.batches.getBatchableSteps().then((batchableSteps) => ({ batchableSteps }));
  }

  @Put('config')
  @Roles(Role.PRODUCTION_MANAGER)
  setConfig(@Body() body: { steps: string[] }, @CurrentUser() user: AuthUser) {
    return this.batches.setBatchableSteps(body.steps ?? [], user);
  }

  // Đơn đang chờ 1 công đoạn (để chọn từ danh sách khi gom lô).
  @Get('candidates')
  @Roles(...BATCH_ROLES)
  candidates(@Query('stepName') stepName: string) {
    return this.batches.candidates(stepName);
  }

  @Get()
  @Roles(...BATCH_ROLES)
  list(@Query('status') status?: string, @Query('stepName') stepName?: string) {
    return this.batches.list({ status, stepName });
  }

  @Post()
  @Roles(...BATCH_ROLES)
  create(@Body() dto: CreateBatchDto, @CurrentUser() user: AuthUser) {
    return this.batches.create(dto, user);
  }

  @Get(':id')
  @Roles(...BATCH_ROLES)
  detail(@Param('id') id: string) {
    return this.batches.detail(id);
  }

  @Post(':id/add')
  @Roles(...BATCH_ROLES)
  addMember(@Param('id') id: string, @Body() dto: AddBatchMemberDto, @CurrentUser() user: AuthUser) {
    return this.batches.addMember(id, dto, user);
  }

  @Post(':id/remove')
  @Roles(...BATCH_ROLES)
  removeMember(@Param('id') id: string, @Body() dto: RemoveBatchMemberDto, @CurrentUser() user: AuthUser) {
    return this.batches.removeMember(id, dto, user);
  }

  @Post(':id/close')
  @Roles(...BATCH_ROLES)
  close(@Param('id') id: string, @Body() dto: CloseBatchDto, @CurrentUser() user: AuthUser) {
    return this.batches.close(id, dto, user);
  }

  @Post(':id/cancel')
  @Roles(...BATCH_ROLES)
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.batches.cancel(id, user);
  }
}
