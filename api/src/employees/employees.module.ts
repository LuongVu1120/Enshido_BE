import { Body, Controller, Get, Module, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@enshido/types';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { EmployeesService } from './employees.service';
import { LinkUserDto, UpsertEmployeeDto } from './dto';

// Nhân sự: Admin/Hành chính(Kế toán) ghi; Quản lý xem (RBAC — Hiến pháp I).
const VIEW = [Role.ADMIN, Role.ACCOUNTANT, Role.PRODUCTION_MANAGER];
const WRITE = [Role.ADMIN, Role.ACCOUNTANT];

@ApiTags('employees')
@Controller('employees')
class EmployeesController {
  constructor(private service: EmployeesService) {}

  @Get()
  @Roles(...VIEW)
  list(
    @Query('q') q?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.service.list({ q, department, status, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get(':id')
  @Roles(...VIEW)
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Get(':id/worklog')
  @Roles(...VIEW)
  worklog(@Param('id') id: string, @Query('month') month?: string) {
    return this.service.worklog(id, month);
  }

  @Post()
  @Roles(...WRITE)
  create(@Body() dto: UpsertEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Post('provision-accounts')
  @Roles(Role.ADMIN)
  provision(@CurrentUser() user: AuthUser) {
    return this.service.provisionAccounts(user);
  }

  @Post(':id/reset-password')
  @Roles(Role.ADMIN)
  resetPassword(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.resetPassword(id, user);
  }

  @Put(':id')
  @Roles(...WRITE)
  update(@Param('id') id: string, @Body() dto: UpsertEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/link-user')
  @Roles(...WRITE)
  linkUser(@Param('id') id: string, @Body() dto: LinkUserDto, @CurrentUser() user: AuthUser) {
    return this.service.linkUser(id, dto, user);
  }

  @Post(':id/unlink-user')
  @Roles(...WRITE)
  unlinkUser(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.unlinkUser(id, user);
  }
}

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
