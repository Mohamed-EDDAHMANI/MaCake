import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
export type RatingCreatedPayload = {
  toUserId: string;
  productId: string | null;
  orderId: string | null;
};

@WebSocketGateway({
  cors: { origin: '*', methods: ['GET', 'POST'] },
  namespace: '/ratings',
})
export class RatingEventsGateway {
  @WebSocketServer()
  server: any;

  emitRatingCreated(payload: RatingCreatedPayload): void {
    if (!this.server) return;
    this.server.emit('rating.created', payload);
  }

  @SubscribeMessage('rating.created')
  handleRatingCreatedFromService(@MessageBody() payload: RatingCreatedPayload): void {
    if (payload?.toUserId) {
      this.emitRatingCreated({
        toUserId: payload.toUserId,
        productId: payload.productId ?? null,
        orderId: payload.orderId ?? null,
      });
    }
  }
}
