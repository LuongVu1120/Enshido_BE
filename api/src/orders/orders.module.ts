import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, TicketsService],
  exports: [OrdersService],
})
export class OrdersModule {}
