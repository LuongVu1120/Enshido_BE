import { Body, Controller, Get, Module, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@enshido/types';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { AutomationService } from './automation.service';

const OPS = [Role.ADMIN, Role.PRODUCTION_MANAGER];
const FIN = [Role.ADMIN, Role.ACCOUNTANT, Role.PRODUCTION_MANAGER];

@ApiTags('automation')
@Controller('automation')
class AutomationController {
  constructor(private service: AutomationService) {}

  @Get('delay-risk')
  @Roles(...OPS)
  delayRisk() {
    return this.service.delayRisk();
  }

  @Get('assignment-suggestion')
  @Roles(...OPS)
  assignment(@Query('stepName') stepName?: string) {
    return this.service.assignmentSuggestion(stepName);
  }

  @Get('kpi')
  @Roles(...FIN)
  kpi(@Query('month') month?: string) {
    return this.service.kpi(month);
  }

  @Get('costing/:orderId')
  @Roles(...FIN)
  costing(@Param('orderId') orderId: string) {
    return this.service.costing(orderId);
  }

  @Get('settings')
  @Roles(...FIN)
  getSettings() {
    return this.service.getSettings();
  }

  @Put('settings')
  @Roles(Role.ADMIN)
  updateSettings(@Body() body: Record<string, number>, @CurrentUser() user: AuthUser) {
    return this.service.updateSettings(body, user);
  }

  @Get('integrations')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  integrations() {
    return this.service.listIntegrations();
  }

  @Post('integrations/:id/sync')
  @Roles(Role.ADMIN)
  sync(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const today = new Date().toISOString().slice(0, 10);
    return this.service.sync(id, user, today);
  }

  @Get('integrations/:id/logs')
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  logs(@Param('id') id: string) {
    return this.service.logs(id);
  }
}

@Module({
  controllers: [AutomationController],
  providers: [AutomationService],
})
export class AutomationModule {}
