import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@enshido/types';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { QCService } from './qc.service';
import { QCFailDto, QCPassDto } from './dto';

@ApiTags('qc')
@Controller('qc')
export class QCController {
  constructor(private qc: QCService) {}

  @Get('orders')
  @Roles(Role.QC, Role.PRODUCTION_MANAGER)
  list() {
    return this.qc.listForQC();
  }

  @Get('stats')
  @Roles(Role.QC, Role.PRODUCTION_MANAGER, Role.ADMIN)
  stats() {
    return this.qc.stats();
  }

  @Get(':orderId/history')
  @Roles(Role.QC, Role.PRODUCTION_MANAGER)
  history(@Param('orderId') orderId: string) {
    return this.qc.history(orderId);
  }

  @Post(':orderId/pass')
  @Roles(Role.QC, Role.PRODUCTION_MANAGER)
  pass(@Param('orderId') orderId: string, @Body() dto: QCPassDto, @CurrentUser() user: AuthUser) {
    return this.qc.pass(orderId, dto, user);
  }

  @Post(':orderId/fail')
  @Roles(Role.QC, Role.PRODUCTION_MANAGER)
  fail(@Param('orderId') orderId: string, @Body() dto: QCFailDto, @CurrentUser() user: AuthUser) {
    return this.qc.fail(orderId, dto, user);
  }
}
