import { Injectable } from '@nestjs/common';
import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

// Realtime cho Kanban/Dashboard (Hiến pháp VII). Single-instance dev không cần
// Redis adapter; prod nhiều instance gắn @socket.io/redis-adapter.
@Injectable()
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class EventsGateway implements OnGatewayInit {
  @WebSocketServer() server!: Server;

  afterInit() {
    // no-op: sẵn sàng phát sự kiện
  }

  emit(event: string, payload: unknown) {
    // Bảo vệ khi server chưa init (vd unit test)
    this.server?.emit(event, payload);
  }

  // Sự kiện chuẩn của domain
  stepChanged(orderId: string, payload: unknown) {
    this.emit('production.step.changed', { orderId, ...(payload as object) });
  }

  orderChanged(orderId: string, status: string) {
    this.emit('order.changed', { orderId, status });
  }
}
