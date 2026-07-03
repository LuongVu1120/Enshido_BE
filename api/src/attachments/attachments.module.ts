import {
  BadRequestException,
  Body,
  Controller,
  Module,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Role } from '@enshido/types';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/storage.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';

class UploadDto {
  @IsString() dataUrl!: string; // data:image/png;base64,....
  @IsString() objectType!: string; // order | qc_record | production_step
  @IsString() objectId!: string;
  @IsOptional() @IsString() orderId?: string;
}

// FR-017 — upload ảnh/file (dev: lưu disk, kiểm soát loại/dung lượng).
@ApiTags('attachments')
@Controller('attachments')
class AttachmentsController {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.PRODUCTION_MANAGER, Role.QC, Role.WORKER)
  async upload(@Body() dto: UploadDto, @CurrentUser() user: AuthUser) {
    const match = /^data:(.+);base64,(.+)$/.exec(dto.dataUrl);
    if (!match) throw new BadRequestException('dataUrl không hợp lệ');
    const mime = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const ext = mime.split('/')[1] ?? 'bin';
    let saved;
    try {
      saved = this.storage.saveBuffer(buffer, mime, ext);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
    const att = await this.prisma.attachment.create({
      data: {
        objectType: dto.objectType,
        objectId: dto.objectId,
        orderId: dto.orderId,
        fileUrl: saved.url,
        fileType: mime,
        sizeBytes: buffer.length,
        uploadedById: user.id,
      },
    });
    return att;
  }
}

@Module({ controllers: [AttachmentsController] })
export class AttachmentsModule {}
