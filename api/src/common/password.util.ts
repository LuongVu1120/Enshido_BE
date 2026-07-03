import { randomBytes } from 'crypto';

// Sinh mật khẩu ngẫu nhiên dễ đọc (Phase 007) — hiển thị 1 lần khi cấp/reset.
export function randomPassword(len = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}
