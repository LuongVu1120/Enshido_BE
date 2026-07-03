import * as os from 'os';
import { ConfigService } from '@nestjs/config';

// Phase 013: URL web công khai để nhúng vào QR — quét được từ điện thoại/app ngoài.
// Ưu tiên PUBLIC_WEB_ORIGIN; nếu WEB_ORIGIN là localhost thì thay host bằng IP LAN.

function lanIPv4(): string | null {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] ?? []) {
      // IPv4 không phải loopback/internal (Node 18+ family có thể là 'IPv4' hoặc 4)
      const isV4 = ni.family === 'IPv4' || (ni.family as unknown as number) === 4;
      if (isV4 && !ni.internal) return ni.address;
    }
  }
  return null;
}

export function getPublicWebOrigin(config: ConfigService): string {
  const explicit = config.get<string>('PUBLIC_WEB_ORIGIN');
  if (explicit?.trim()) return explicit.trim().replace(/\/$/, '');

  const base = config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
  try {
    const u = new URL(base);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      const ip = lanIPv4();
      if (ip) u.hostname = ip;
    }
    return u.origin;
  } catch {
    return base.replace(/\/$/, '');
  }
}
