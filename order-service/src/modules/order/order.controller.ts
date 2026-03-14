import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ORDERS_PATTERNS } from '../../messaging';
import { ValidatedBody } from 'src/common/decorators/validated-body.decorator';

@Controller()
export class OrderController {
  private readonly logger = new Logger(OrderController.name);
  constructor(private readonly orderService: OrderService) {}

  @MessagePattern(ORDERS_PATTERNS.ORDER_CREATE)
  create(@ValidatedBody(CreateOrderDto) createOrderDto: CreateOrderDto) {
    // this.logger.debug(`Creating order for user ${createOrderDto}`);
    return this.orderService.create(createOrderDto);
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_ACCEPT)
  accept(@Payload() payload: { params: { id: string }; user?: { sub?: string } }) {
    const id = payload.params.id;
    return this.orderService.acceptOrder(id, payload?.user?.sub ?? '');
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_COMPLETE)
  complete(@Payload() payload: { params: { id: string }; user?: { sub?: string } }) {
    const id = payload.params.id;
    return this.orderService.completeOrder(id, payload?.user?.sub ?? '');
  }

  // Compatibility for gateway forwarding "/order/accept/:id" as pattern "order/accept"
  @MessagePattern('order/accept')
  acceptFromGatewayRoute(@Payload() payload: { params: { id: string }; user?: { sub?: string } }) {
    const id = payload.params.id;
    return this.orderService.acceptOrder(id, payload?.user?.sub ?? '');
  }

  // Compatibility for gateway forwarding "/order/complete/:id" as pattern "order/complete"
  @MessagePattern('order/complete')
  completeFromGatewayRoute(@Payload() payload: { params: { id: string }; user?: { sub?: string } }) {
    const id = payload.params.id;
    return this.orderService.completeOrder(id, payload?.user?.sub ?? '');
  }

  // Compatibility handler for gateway route style: /s3/order/create -> "order/create"
  @MessagePattern('order/create')
  createFromGatewayRoute(@ValidatedBody(CreateOrderDto) createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_FIND_ALL)
  findAll(@Payload() payload: { user?: { sub?: string; role?: string } }) {
    return this.orderService.findAll(payload?.user?.sub ?? '', payload?.user?.role ?? '');
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_FIND_PATISSIERE)
  findPatissiereOrders(@Payload() payload: { user?: { sub?: string } }) {
    return this.orderService.findPatissiereOrders(payload?.user?.sub ?? '');
  }

  // Compatibility for gateway forwarding "/orders/patissiere/find-all" as pattern "orders/patissiere"
  @MessagePattern('orders/patissiere')
  findPatissiereOrdersFromGatewayRoute(@Payload() payload: { user?: { sub?: string } }) {
    return this.orderService.findPatissiereOrders(payload?.user?.sub ?? '');
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_FIND_ONE)
  findOne(@Payload() payload: { params: { id: string }; user?: { sub?: string; role?: string } }) {
    const id = payload.params.id;
    return this.orderService.findOne(id, payload?.user?.sub ?? '', payload?.user?.role ?? '');
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
    return this.orderService.markPaymentCompleted(id, clientId);
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
    return this.orderService.markPaymentCompleted(id, clientId);
  }

  // Compatibility for gateway forwarding "/order/find-one/:id" as pattern "order/find-one"
  @MessagePattern('order/find-one')
  findOneFromGatewayRoute(@Payload() payload: { params: { id: string }; user?: { sub?: string; role?: string } }) {
    const id = payload.params.id;
    return this.orderService.findOne(id, payload?.user?.sub ?? '', payload?.user?.role ?? '');
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_REMOVE)
  remove(@Payload()  payload: { params: { id: string } }) {
    const id = payload.params.id;
    return this.orderService.remove(id);
  }
}
