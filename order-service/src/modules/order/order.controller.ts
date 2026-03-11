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

  @MessagePattern(ORDERS_PATTERNS.ORDER_FIND_ONE)
  findOne(@Payload() payload: { params: { id: string }; user?: { sub?: string; role?: string } }) {
    const id = payload.params.id;
    return this.orderService.findOne(id, payload?.user?.sub ?? '', payload?.user?.role ?? '');
  }

  @MessagePattern(ORDERS_PATTERNS.ORDER_REMOVE)
  remove(@Payload()  payload: { params: { id: string } }) {
    const id = payload.params.id;
    return this.orderService.remove(id);
  }
}
