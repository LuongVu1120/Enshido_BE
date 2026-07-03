import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { EmployeeStatus, Role, STEP_LABELS, StepName, StepStatus, UserStatus } from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';
import { CodesService } from '../common/codes.service';
import { AuditService } from '../common/audit.service';
import { AuthUser } from '../common/decorators';
import { randomPassword } from '../common/password.util';
import { LinkUserDto, UpsertEmployeeDto } from './dto';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private codes: CodesService,
    private audit: AuditService,
  ) {}

  // ─── US1: Hồ sơ nhân viên ──────────────────────────────────────────────────
  async list(params: { q?: string; department?: string; status?: string; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const where: any = {};
    if (params.department) where.department = params.department;
    if (params.status) where.status = params.status;
    if (params.q) where.OR = [{ name: { contains: params.q } }, { code: { contains: params.q } }];

    const [items, total, byDeptRaw] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, email: true, role: true, status: true } } },
      }),
      this.prisma.employee.count({ where }),
      this.prisma.employee.groupBy({ by: ['department'], _count: { _all: true } }),
    ]);
    const byDepartment = byDeptRaw.map((d) => ({ department: d.department ?? '—', count: d._count._all }));
    return { items, total, page, pageSize, byDepartment };
  }

  async detail(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, role: true, status: true } } },
    });
    if (!emp) throw new NotFoundException('Không tìm thấy nhân viên');
    return emp;
  }

  // Phase 007: tạo NV LUÔN kèm tài khoản (email bắt buộc, mật khẩu ngẫu nhiên hiện 1 lần).
  async create(dto: UpsertEmployeeDto, user: AuthUser) {
    if (!dto.email?.trim()) throw new BadRequestException('Email là bắt buộc để cấp tài khoản');
    const dup = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (dup) throw new BadRequestException('Email đã được dùng cho tài khoản khác');

    const code = await this.codes.nextEmployeeCode();
    const role = (dto.role as Role) ?? Role.WORKER;
    const tempPassword = randomPassword();
    const passwordHash = await argon2.hash(tempPassword);

    const emp = await this.prisma.employee.create({
      data: {
        code,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        department: dto.department,
        position: dto.position,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : null,
        status: dto.status ?? EmployeeStatus.ACTIVE,
        skills: dto.skills,
        note: dto.note,
        user: { create: { name: dto.name, email: dto.email, role, passwordHash } },
      },
      include: { user: { select: { id: true, email: true, role: true, status: true } } },
    });
    await this.audit.log({ userId: user.id, action: 'employee.create', objectType: 'employee', objectId: emp.id, newValue: { code, name: emp.name, account: dto.email, role } });
    return { ...emp, account: { email: dto.email, role, tempPassword } };
  }

  // Cấp tài khoản cho NV cũ chưa có (FR-002).
  async provisionAccounts(actor: AuthUser) {
    const noAccount = await this.prisma.employee.findMany({ where: { user: { is: null } } });
    const created: { code: string; email: string; tempPassword: string }[] = [];
    for (const e of noAccount) {
      const email = e.email || `${e.code.toLowerCase()}@enshido.vn`;
      if (await this.prisma.user.findUnique({ where: { email } })) continue;
      const tempPassword = randomPassword();
      await this.prisma.user.create({
        data: { name: e.name, email, role: Role.WORKER, passwordHash: await argon2.hash(tempPassword), employeeId: e.id, status: e.status === EmployeeStatus.RESIGNED ? UserStatus.LOCKED : UserStatus.ACTIVE },
      });
      created.push({ code: e.code, email, tempPassword });
    }
    await this.audit.log({ userId: actor.id, action: 'employee.provision-accounts', objectType: 'employee', newValue: { count: created.length } });
    return { provisioned: created.length, accounts: created };
  }

  // Reset mật khẩu (Admin) — sinh mật khẩu ngẫu nhiên mới, trả về 1 lần (FR T712).
  async resetPassword(id: string, actor: AuthUser) {
    const emp = await this.detail(id);
    if (!emp.user) throw new BadRequestException('Nhân viên chưa có tài khoản');
    const tempPassword = randomPassword();
    await this.prisma.user.update({ where: { id: emp.user.id }, data: { passwordHash: await argon2.hash(tempPassword) } });
    await this.audit.log({ userId: actor.id, action: 'employee.reset-password', objectType: 'user', objectId: emp.user.id });
    return { email: emp.user.email, tempPassword };
  }

  async update(id: string, dto: UpsertEmployeeDto, user: AuthUser) {
    const before = await this.detail(id);
    const emp = await this.prisma.employee.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        department: dto.department,
        position: dto.position,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
        status: dto.status,
        skills: dto.skills,
        note: dto.note,
      },
    });

    // FR-002: nghỉ việc → khóa tài khoản đăng nhập (nếu có), giữ dữ liệu lịch sử.
    if (dto.status === EmployeeStatus.RESIGNED && before.user) {
      await this.prisma.user.update({ where: { id: before.user.id }, data: { status: UserStatus.LOCKED } });
    }
    // Phase 010 (FR-005): đổi họ tên → đồng bộ tên tài khoản đăng nhập liên kết.
    if (before.user && dto.name && dto.name !== before.name) {
      await this.prisma.user.update({ where: { id: before.user.id }, data: { name: dto.name } });
    }
    await this.audit.log({
      userId: user.id,
      action: 'employee.update',
      objectType: 'employee',
      objectId: id,
      oldValue: { status: before.status },
      newValue: { status: emp.status },
    });
    return this.detail(id);
  }

  // Gắn / bỏ tài khoản đăng nhập cho nhân viên.
  async linkUser(id: string, dto: LinkUserDto, actor: AuthUser) {
    await this.detail(id);
    const target = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!target) throw new BadRequestException('Tài khoản không tồn tại');
    await this.prisma.user.update({ where: { id: dto.userId }, data: { employeeId: id } });
    await this.audit.log({ userId: actor.id, action: 'employee.link-user', objectType: 'employee', objectId: id, newValue: { userId: dto.userId } });
    return this.detail(id);
  }

  async unlinkUser(id: string, actor: AuthUser) {
    const emp = await this.detail(id);
    if (emp.user) await this.prisma.user.update({ where: { id: emp.user.id }, data: { employeeId: null } });
    await this.audit.log({ userId: actor.id, action: 'employee.unlink-user', objectType: 'employee', objectId: id });
    return this.detail(id);
  }

  // ─── US6: Bảng công việc theo tháng (FR-008, SC-005) ──────────────────────
  private monthRange(month?: string) {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth() + 1;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [yy, mm] = month.split('-').map(Number);
      y = yy;
      m = mm;
    }
    return {
      from: new Date(y, m - 1, 1, 0, 0, 0, 0),
      to: new Date(y, m, 0, 23, 59, 59, 999),
      label: `${String(m).padStart(2, '0')}/${y}`,
    };
  }

  async worklog(id: string, month?: string) {
    const emp = await this.detail(id);
    const { from, to, label } = this.monthRange(month);

    if (!emp.user) {
      return {
        employee: { id: emp.id, code: emp.code, name: emp.name },
        month: label,
        hasAccount: false,
        summary: { completed: 0, output: 0, onTimeRate: 0, defectRate: 0, qcCount: 0, lossCaused: 0 },
        steps: [],
        note: 'Nhân viên chưa gắn tài khoản → chưa được giao việc trong mô hình hiện tại.',
      };
    }

    const userId = emp.user.id;
    const range = { gte: from, lte: to };
    const [steps, qcCount, lossLogs] = await Promise.all([
      // Phase 007: tính theo NGƯỜI THỰC HIỆN (performedById), không phải người được gán.
      this.prisma.productionStep.findMany({
        where: { performedById: userId, status: StepStatus.DONE, completedAt: range },
        include: { order: { select: { code: true, deadline: true } } },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.qCRecord.count({ where: { qcUserId: userId, createdAt: range } }),
      this.prisma.weightLog.findMany({ where: { measuredById: userId, measuredAt: range }, select: { lossWeight: true } }),
    ]);

    const completed = steps.length;
    const output = steps.reduce((s, x) => s + (x.completedQuantity ?? 1), 0);
    const onTime = steps.filter((x) => x.order?.deadline && x.completedAt && new Date(x.completedAt) <= new Date(x.order.deadline)).length;
    const defect = steps.reduce((s, x) => s + (x.defectQuantity ?? 0), 0);
    const lossCaused = round2(lossLogs.reduce((s, x) => s + x.lossWeight, 0));

    return {
      employee: { id: emp.id, code: emp.code, name: emp.name, position: emp.position, department: emp.department },
      month: label,
      hasAccount: true,
      summary: {
        completed,
        output,
        onTimeRate: completed ? round2((onTime / completed) * 100) : 0,
        defectRate: output ? round2((defect / output) * 100) : 0,
        qcCount,
        lossCaused,
      },
      steps: steps.map((x) => ({
        orderCode: x.order?.code,
        step: STEP_LABELS[x.stepName as StepName] ?? x.stepName,
        completedAt: x.completedAt,
        quantity: x.completedQuantity ?? 1,
        defect: x.defectQuantity ?? 0,
      })),
    };
  }
}
