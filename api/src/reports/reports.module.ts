import { Controller, Get, Header, Module, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@enshido/types';
import { Roles } from '../common/decorators';
import { ReportsService } from './reports.service';

// Báo cáo chỉ cho Admin/Quản lý/Kế toán (dữ liệu nhạy cảm — Hiến pháp I).
const VIEW = [Role.ADMIN, Role.PRODUCTION_MANAGER, Role.ACCOUNTANT];

@ApiTags('reports')
@Controller('reports')
@Roles(...VIEW)
class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('orders')
  orders(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.orders(from, to);
  }

  @Get('production')
  production(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.production(from, to);
  }

  @Get('qc')
  qc(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.qc(from, to);
  }

  @Get('loss')
  loss(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.loss(from, to);
  }

  @Get('productivity')
  productivity(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.productivity(from, to);
  }

  @Get('inventory')
  inventory() {
    return this.service.inventory();
  }

  @Get('dashboard')
  dashboard(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.dashboardAdvanced(from, to);
  }

  @Get(':kind/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="enshido-report.csv"')
  export(@Param('kind') kind: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.exportCsv(kind, from, to);
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
