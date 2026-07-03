import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Role, UserStatus } from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (user.status === UserStatus.LOCKED)
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role as Role };
    const tokens = await this.issueTokens(payload);
    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.status === UserStatus.LOCKED)
        throw new UnauthorizedException('Phiên không hợp lệ');
      return this.issueTokens({ sub: user.id, email: user.email, role: user.role as Role });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  private async issueTokens(payload: JwtPayload) {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '900s',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL') ?? '7d',
    });
    return { accessToken, refreshToken };
  }

  // Tự đổi mật khẩu (US5): xác minh mật khẩu cũ trước khi đổi.
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Phiên không hợp lệ');
    const ok = await argon2.verify(user.passwordHash, oldPassword);
    if (!ok) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await argon2.hash(newPassword) } });
    return { ok: true };
  }

  static hash(password: string) {
    return argon2.hash(password);
  }
}
