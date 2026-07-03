import { Module } from '@nestjs/common';
import { WeightModule } from '../weight/weight.module';
import { ProductionController } from './production.controller';
import { ScanController } from './scan.controller';
import { ProductionService } from './production.service';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';

@Module({
  imports: [WeightModule],
  controllers: [ProductionController, ScanController, BatchesController],
  providers: [ProductionService, BatchesService],
})
export class ProductionModule {}
