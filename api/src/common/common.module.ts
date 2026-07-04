import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CodesService } from './codes.service';
import { EventsGateway } from './events.gateway';
import { StorageService } from './storage.service';

// Tiện ích xuyên suốt: audit (append-only), sinh mã, realtime, lưu file.
@Global()
@Module({
  providers: [AuditService, CodesService, EventsGateway, StorageService],
  exports: [AuditService, CodesService, EventsGateway, StorageService],
})
export class CommonModule {}
