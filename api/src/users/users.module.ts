import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role, UserStatus } from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';

@ApiTags('users')
@Controller('users')
class UsersController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // Danh sách user (cho dropdown gán việc). Lọc theo vai trò (vd WORKER).
  @Get()
  async list(@Query('role') role?: string) {
    return this.prisma.user.findMany({
      where: role ? { role } : {},
      select: { id: true, name: true, role: true, status: true, email: true },
      orderBy: { name: 'asc' },
    });
  }

  // Khóa/mở tài khoản — KHÔNG xóa cứng (FR-002, Hiến pháp I).
  @Post(':id/lock')
  @Roles(Role.ADMIN)
  async lock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.LOCKED },
    });
    await this.audit.log({
      userId: user.id,
      action: 'user.lock',
      objectType: 'user',
      objectId: id,
      newValue: { status: UserStatus.LOCKED },
    });
    return { id: updated.id, status: updated.status };
  }

  @Post(':id/unlock')
  @Roles(Role.ADMIN)
  async unlock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
    });
    await this.audit.log({
      userId: user.id,
      action: 'user.unlock',
      objectType: 'user',
      objectId: id,
      newValue: { status: UserStatus.ACTIVE },
    });
    return { id: updated.id, status: updated.status };
  }
}

@Module({ controllers: [UsersController] })
export class UsersModule {}
