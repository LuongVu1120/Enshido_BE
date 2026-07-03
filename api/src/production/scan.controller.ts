import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@enshido/types';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { ProductionService } from './production.service';
import { CompleteStepDto, ReportIssueDto, StepTargetDto } from './dto';

// FR-008: quét QR YÊU CẦU đăng nhập (JwtAuthGuard global). Chưa đăng nhập → 401 → FE về /login.
@ApiTags('scan')
@Controller('scan')
export class ScanController {
  constructor(private production: ProductionService) {}

  @Get(':token')
  landing(@Param('token') token: string, @CurrentUser() user: AuthUser) {
    return this.production.scanLanding(token, user);
  }

  @Post(':token/accept')
  @Roles(Role.WORKER, Role.PRODUCTION_MANAGER)
  accept(@Param('token') token: string, @Body() dto: StepTargetDto, @CurrentUser() user: AuthUser) {
    return this.withOrder(token, (orderId) => this.production.accept(orderId, dto, user));
  }

  @Post(':token/start')
  @Roles(Role.WORKER, Role.PRODUCTION_MANAGER)
  start(@Param('token') token: string, @Body() dto: StepTargetDto, @CurrentUser() user: AuthUser) {
    return this.withOrder(token, (orderId) => this.production.start(orderId, dto, user));
  }

  @Post(':token/complete')
  @Roles(Role.WORKER, Role.PRODUCTION_MANAGER)
  complete(@Param('token') token: string, @Body() dto: CompleteStepDto, @CurrentUser() user: AuthUser) {
    return this.withOrder(token, (orderId) => this.production.complete(orderId, dto, user));
  }

  @Post(':token/report-issue')
  @Roles(Role.WORKER, Role.PRODUCTION_MANAGER)
  reportIssue(@Param('token') token: string, @Body() dto: ReportIssueDto, @CurrentUser() user: AuthUser) {
    return this.withOrder(token, (orderId) => this.production.reportIssue(orderId, dto, user));
  }

  // Resolve token → orderId qua landing (đã kiểm tra qrActive).
  private async withOrder<T>(token: string, fn: (orderId: string) => Promise<T>) {
    const landing = await this.production.scanLandingResolve(token);
    return fn(landing.id);
  }
}
