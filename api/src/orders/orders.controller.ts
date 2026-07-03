import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@enshido/types';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { OrdersService } from './orders.service';
import { TicketsService } from './tickets.service';
import {
  ChangeStatusDto,
  ConfigureStepsDto,
  CreateOrderDto,
  UpdateOrderDto,
} from './dto';

// Đọc đơn: nhân viên văn phòng/sản xuất (KHÔNG gồm Thợ — thợ dùng /production/my-tasks + /scan).
const VIEW = [Role.ADMIN, Role.PRODUCTION_MANAGER, Role.ACCOUNTANT, Role.QC, Role.WAREHOUSE];

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private orders: OrdersService,
    private tickets: TicketsService,
  ) {}

  @Get()
  @Roles(...VIEW)
  list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('priority') priority?: string,
    @Query('lateOnly') lateOnly?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.orders.list({
      q,
      status,
      channel,
      priority,
      lateOnly: lateOnly === 'true' || lateOnly === '1',
      from,
      to,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get('export')
  @Roles(Role.ADMIN, Role.PRODUCTION_MANAGER, Role.ACCOUNTANT)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="enshido-don-hang.csv"')
  export(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.orders.exportCsv({ q, status, channel, from, to });
  }

  @Get(':id')
  @Roles(...VIEW)
  detail(@Param('id') id: string) {
    return this.orders.detail(id);
  }

  @Get(':id/timeline')
  @Roles(...VIEW)
  timeline(@Param('id') id: string) {
    return this.orders.timeline(id);
  }

  @Post()
  @Roles(Role.PRODUCTION_MANAGER)
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.orders.create(dto, user);
  }

  @Put(':id')
  @Roles(Role.PRODUCTION_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto, @CurrentUser() user: AuthUser) {
    return this.orders.update(id, dto, user);
  }

  @Post(':id/status')
  @Roles(Role.PRODUCTION_MANAGER)
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto, @CurrentUser() user: AuthUser) {
    return this.orders.changeStatus(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.PRODUCTION_MANAGER)
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.orders.cancel(id, user);
  }

  @Post(':id/configure-steps')
  @Roles(Role.PRODUCTION_MANAGER)
  configureSteps(@Param('id') id: string, @Body() dto: ConfigureStepsDto, @CurrentUser() user: AuthUser) {
    return this.orders.configureSteps(id, dto, user);
  }

  @Post(':id/print-production-ticket')
  @Roles(Role.PRODUCTION_MANAGER)
  printTicket(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tickets.printTicket(id, user);
  }
}
