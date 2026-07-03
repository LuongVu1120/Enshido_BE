import { Body, Controller, Delete, Get, Param, Put, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@enshido/types';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { ProductionService } from './production.service';
import { AssignStepDto } from './dto';

@ApiTags('production')
@Controller('production')
export class ProductionController {
  constructor(private production: ProductionService) {}

  // "Việc của tôi" — công đoạn đang gán cho user hiện tại (mọi vai trò, tự xem).
  @Get('my-tasks')
  myTasks(@CurrentUser() user: AuthUser) {
    return this.production.myTasks(user);
  }

  // Kanban theo TRẠNG THÁI ĐƠN (Phase 006). (Kanban theo công đoạn cũ đã gỡ bỏ.)
  @Get('board')
  board(@Query('q') q?: string) {
    return this.production.board({ q });
  }

  // Kanban theo CÔNG ĐOẠN (Phase 011b) — đơn nằm ở cột công đoạn hiện tại.
  @Get('board/by-step')
  boardByStep(@Query('q') q?: string) {
    return this.production.boardByStep({ q });
  }

  @Get('board/columns')
  listColumns() {
    return this.production.listColumns(true);
  }

  @Post('board/columns')
  @Roles(Role.PRODUCTION_MANAGER)
  addColumn(@Body() dto: { status: string; label?: string }, @CurrentUser() user: AuthUser) {
    return this.production.addColumn(dto, user);
  }

  @Put('board/columns/:id')
  @Roles(Role.PRODUCTION_MANAGER)
  updateColumn(@Param('id') id: string, @Body() dto: { label?: string; position?: number; visible?: boolean }, @CurrentUser() user: AuthUser) {
    return this.production.updateColumn(id, dto, user);
  }

  @Delete('board/columns/:id')
  @Roles(Role.PRODUCTION_MANAGER)
  deleteColumn(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.production.deleteColumn(id, user);
  }

  @Post('steps/:id/assign')
  @Roles(Role.PRODUCTION_MANAGER)
  assign(@Param('id') id: string, @Body() dto: AssignStepDto, @CurrentUser() user: AuthUser) {
    return this.production.assign(id, dto, user);
  }

  @Put('steps/:id')
  @Roles(Role.PRODUCTION_MANAGER)
  updateStep(@Param('id') id: string, @Body() body: { status?: string }, @CurrentUser() user: AuthUser) {
    return this.production.updateStep(id, body, user);
  }
}
