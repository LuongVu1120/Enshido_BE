import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

// Lưu file ảnh/thiết kế. Dev: disk (./uploads). Prod: STORAGE_DRIVER=s3 (MinIO/S3 presigned).
// FR-017 + Hiến pháp VI (kiểm soát loại & dung lượng).
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

@Injectable()
export class StorageService {
  private uploadDir = join(process.cwd(), 'uploads');

  constructor(private config: ConfigService) {
    mkdirSync(this.uploadDir, { recursive: true });
  }

  validate(mimeType: string, sizeBytes: number) {
    if (!ALLOWED_TYPES.includes(mimeType)) {
      throw new Error(`Loại file không hợp lệ: ${mimeType}`);
    }
    if (sizeBytes > MAX_BYTES) {
      throw new Error('File vượt quá 10MB');
    }
  }

  // Lưu base64/data trực tiếp (dùng cho upload ảnh từ màn hình thợ/QC ở MVP).
  saveBuffer(buffer: Buffer, mimeType: string, ext = 'bin'): { url: string } {
    this.validate(mimeType, buffer.length);
    const name = `${randomUUID()}.${ext}`;
    writeFileSync(join(this.uploadDir, name), buffer);
    return { url: `/uploads/${name}` };
  }
}
