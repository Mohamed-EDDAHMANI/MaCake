import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ORDERS_PATTERNS } from '../../messaging';
import { ValidatedBody } from '../../common/decorators/validated-body.decorator';
import { CreateOrderDto } from '../dto/create-order.dto';
import { CreateOrderUseCase } from '../../application/use-cases/order/create-order.use-case';
import { FindAllOrdersUseCase } from '../../application/use-cases/order/find-all-orders.use-case';
import { FindOneOrderUseCase } from '../../application/use-cases/order/find-one-order.use-case';
import { AcceptOrderUseCase } from '../../application/use-cases/order/accept-order.use-case';
import { RefuseOrderUseCase } from '../../application/use-cases/order/refuse-order.use-case';
import { DeleteOrderUseCase } from '../../application/use-cases/order/delete-order.use-case';
import { CompleteOrderUseCase } from '../../application/use-cases/order/complete-order.use-case';
import { MarkPaymentCompletedUseCase } from '../../application/use-cases/order/mark-payment-completed.use-case';
import { MarkDeliveredByClientUseCase } from '../../application/use-cases/order/mark-delivered-by-client.use-case';
import { MarkDeliveredByDeliveryUseCase } from '../../application/use-cases/order/mark-delivered-by-delivery.use-case';
import { StartDeliveryUseCase } from '../../application/use-cases/order/start-delivery.use-case';

@Controller()
export class OrderDddController {
  private readonly logger = new Logger(OrderDddController.name);

  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly findAllOrdersUseCase: FindAllOrdersUseCase,
    private readonly findOneOrderUseCase: FindOneOrderUseCase,
    private readonly acceptOrderUseCase: AcceptOrderUseCase,
    private readonly refuseOrderUseCase: RefuseOrderUseCase,
    private readonly deleteOrderUseCase: DeleteOrderUseCase,
    private readonly completeOrderUseCase: CompleteOrderUseCase,
    private readonly markPaymentCompletedUseCase: MarkPaymentCompletedUseCase,
    private readonly markDeliveredByClientUseCase: MarkDeliveredByClientUseCase,
    private readonly markDeliveredByDeliveryUseCase: MarkDeliveredByDeliveryUseCase,
    private readonly startDeliveryUseCase: StartDeliveryUseCase,
  ) {}

  @MessagePattern(ORDERS_PATTERNS.ORDER_CREATE)
  create(@ValidatedBody(CreateOrderDto) createOrderDto: CreateOrderDto) {
    return this.createOrderUseCase.execute(createOrderDto as any);
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_ACCEPT)
  accept(@Payload() payload: { params: { id: string }; user?: { sub?: string } }) {
    const id = payload.params.id;
    return this.acceptOrderUseCase.execute(id, payload?.user?.sub ?? '');
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_COMPLETE)
  complete(@Payload() payload: { params: { id: string }; user?: { sub?: string } }) {
    const id = payload.params.id;
    return this.completeOrderUseCase.execute(id, payload?.user?.sub ?? '');
  }

  // Compatibility for gateway forwarding "/order/accept/:id" as pattern "order/accept"
  @MessagePattern('order/accept')
  acceptFromGatewayRoute(@Payload() payload: { params: { id: string }; user?: { sub?: string } }) {
    const id = payload.params.id;
    return this.acceptOrderUseCase.execute(id, payload?.user?.sub ?? '');
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_REFUSE)
  refuse(@Payload() payload: { params: { id: string }; user?: { sub?: string } }) {
    const id = payload.params.id;
    return this.refuseOrderUseCase.execute(id, payload?.user?.sub ?? '');
  }

  // Compatibility for gateway forwarding "/order/refuse/:id" as pattern "order/refuse"
  @MessagePattern('order/refuse')
  refuseFromGatewayRoute(@Payload() payload: { params: { id: string }; user?: { sub?: string } }) {
    const id = payload.params.id;
    return this.refuseOrderUseCase.execute(id, payload?.user?.sub ?? '');
  }

  // Compatibility for gateway forwarding "/order/complete/:id" as pattern "order/complete"
  @MessagePattern('order/complete')
  completeFromGatewayRoute(@Payload() payload: { params: { id: string }; user?: { sub?: string } }) {
    const id = payload.params.id;
    return this.completeOrderUseCase.execute(id, payload?.user?.sub ?? '');
  }

  // Compatibility handler for gateway route style: /s3/order/create -> "order/create"
  @MessagePattern('order/create')
  createFromGatewayRoute(@ValidatedBody(CreateOrderDto) createOrderDto: CreateOrderDto) {
    return this.createOrderUseCase.execute(createOrderDto as any);
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_FIND_ALL)
  findAll(@Payload() payload: { user?: { sub?: string; role?: string } }) {
    return this.findAllOrdersUseCase.execute(payload?.user?.sub ?? '', payload?.user?.role ?? '');
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_FIND_PATISSIERE)
  findPatissiereOrders(@Payload() payload: { user?: { sub?: string } }) {
    return this.findAllOrdersUseCase.execute(payload?.user?.sub ?? '', 'patissiere');
  }

  // Compatibility for gateway forwarding "/orders/patissiere/find-all" as pattern "orders/patissiere"
  @MessagePattern('orders/patissiere')
  findPatissiereOrdersFromGatewayRoute(@Payload() payload: { user?: { sub?: string } }) {
    return this.findAllOrdersUseCase.execute(payload?.user?.sub ?? '', 'patissiere');
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_FIND_ONE)
  findOne(@Payload() payload: { params: { id: string }; user?: { sub?: string; role?: string } }) {
    const id = payload.params.id;
    return this.findOneOrderUseCase.execute(id, payload?.user?.sub ?? '', payload?.user?.role ?? '');
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_UPDATE_STATUS)
  markPaymentCompleted(
    @Payload()
    payload: {
      params?: { id?: string };
      orderId?: string;
      user?: { id?: string; sub?: string };
    },
  ) {
    const id = payload?.params?.id ?? payload?.orderId ?? '';
    const clientId = payload?.user?.sub ?? payload?.user?.id ?? '';
    return this.markPaymentCompletedUseCase.execute(id, clientId);
  }

  // Compatibility for legacy callers using singular pattern key.
  @MessagePattern('order/update-status')
  markPaymentCompletedLegacy(
    @Payload()
    payload: {
      params?: { id?: string };
      orderId?: string;
      user?: { id?: string; sub?: string };
    },
  ) {
    const id = payload?.params?.id ?? payload?.orderId ?? '';
    const clientId = payload?.user?.sub ?? payload?.user?.id ?? '';
    return this.markPaymentCompletedUseCase.execute(id, clientId);
  }

  // Compatibility for gateway forwarding "/order/find-one/:id" as pattern "order/find-one"
  @MessagePattern('order/find-one')
  findOneFromGatewayRoute(@Payload() payload: { params: { id: string }; user?: { sub?: string; role?: string } }) {
    const id = payload.params.id;
    return this.findOneOrderUseCase.execute(id, payload?.user?.sub ?? '', payload?.user?.role ?? '');
  }

  @MessagePattern('order/delivered-by-client')
  markDeliveredByClient(@Payload() payload: { params: { id: string }; user?: { sub?: string } }) {
    const id = payload?.params?.id ?? '';
    const clientId = payload?.user?.sub ?? '';
    return this.markDeliveredByClientUseCase.execute(id, clientId);
  }

  @MessagePattern('order/start-delivery')
  startDelivery(@Payload() payload: { params: { id: string }; user?: { sub?: string } }) {
    const id = payload?.params?.id ?? '';
    const clientId = payload?.user?.sub ?? '';
    return this.startDeliveryUseCase.execute(id, clientId);
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_REMOVE)
  remove(@Payload() payload: { params: { id: string }; user?: { sub?: string; role?: string } }) {
    const id = payload.params.id;
    return this.deleteOrderUseCase.execute(id, payload?.user?.sub ?? '', payload?.user?.role ?? '');
  }

  // Compatibility for gateway forwarding "/order/delete/:id" as pattern "order/delete"
  @MessagePattern('order/delete')
  deleteFromGatewayRoute(@Payload() payload: { params: { id: string }; user?: { sub?: string; role?: string } }) {
    const id = payload.params.id;
    return this.deleteOrderUseCase.execute(id, payload?.user?.sub ?? '', payload?.user?.role ?? '');
  }
}
