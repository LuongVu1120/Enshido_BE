import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@enshido/types';
import { Roles } from '../common/decorators';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.PRODUCTION_MANAGER, Role.ACCOUNTANT)
  summary() {
    return this.service.summary();
  }
}

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
