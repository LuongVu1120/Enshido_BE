import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@enshido/types';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { WeightService } from './weight.service';
import { CreateWeightLogDto } from './dto';

@ApiTags('weight')
@Controller('orders/:id/weight-logs')
export class WeightController {
  constructor(private service: WeightService) {}

  @Get()
  @Roles(Role.ADMIN, Role.PRODUCTION_MANAGER, Role.QC, Role.ACCOUNTANT, Role.WAREHOUSE)
  list(@Param('id') id: string) {
    return this.service.list(id);
  }

  @Post()
  @Roles(Role.WORKER, Role.PRODUCTION_MANAGER, Role.QC)
  create(@Param('id') id: string, @Body() dto: CreateWeightLogDto, @CurrentUser() user: AuthUser) {
    return this.service.create(id, dto, user);
  }
}
