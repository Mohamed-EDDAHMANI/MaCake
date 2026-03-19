import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/orders',
})
export class OrderEventsGateway {
  @WebSocketServer()
  // Use loose typing here to avoid issues with missing Socket.IO typings inside Docker TS watcher
  server: any;

  /**
   * Emit a generic status update event for an order.
   * Called from HTTP forward when order response is returned, or from handleOrderStatusFromService.
   */
  emitOrderStatusChanged(payload: { orderId: string; status: string }) {
    if (!this.server) return;
    this.server.emit('order.status.changed', payload);
  }

  /**
   * When order-service (or any client) emits order.status.changed (e.g. after payment via RabbitMQ),
   * broadcast to all connected clients so patissiere sees real-time progress.
   */
  @SubscribeMessage('order.status.changed')
  handleOrderStatusFromService(@MessageBody() payload: { orderId: string; status: string }) {
    if (payload?.orderId && payload?.status) {
      this.emitOrderStatusChanged({ orderId: payload.orderId, status: payload.status });
    }
  }

  /**
   * Broadcast estimation.created so clients viewing that order can refetch estimations in real time.
   */
  emitEstimationCreated(payload: { orderId: string }) {
    if (!this.server) return;
    this.server.emit('estimation.created', payload);
  }

  @SubscribeMessage('estimation.created')
  handleEstimationCreatedFromService(@MessageBody() payload: { orderId: string }) {
    if (payload?.orderId) {
      this.emitEstimationCreated({ orderId: payload.orderId });
    }
  }
}

