import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EstimationService } from './estimation.service';
import { CreateEstimationDto } from './dto/create-estimation.dto';
import { ORDERS_PATTERNS } from '../../messaging';
import { ValidatedBody } from 'src/common/decorators/validated-body.decorator';

@Controller()
export class EstimationController {
  constructor(private readonly estimationService: EstimationService) {}

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_CLIENT_CREATE)
  clientCreateEstimation(@ValidatedBody(CreateEstimationDto) dto: CreateEstimationDto) {
    return this.estimationService.clientCreateEstimation(dto);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_DELIVERY_CREATE)
  deliveryCreateEstimation(
    @Payload() payload: { body?: CreateEstimationDto; user?: { sub?: string } },
  ) {
    const dto = payload?.body ?? (payload as any);
    const userId = payload?.user?.sub ?? '';
    return this.estimationService.deliveryCreateEstimation(dto, userId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_FIND_BY_ORDER)
  findByOrder(@Payload() payload: { params: { orderId: string } }) {
    const orderId = payload?.params?.orderId ?? (payload as any)?.params?.id ?? '';
    return this.estimationService.findByOrderId(orderId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_FIND_PENDING_CLIENT)
  findPendingClientEstimations() {
    return this.estimationService.findPendingClientEstimations();
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_CONFIRM)
  confirmEstimation(
    @Payload() payload: { params: { id: string }; user?: { sub?: string } },
  ) {
    const estimationId = payload?.params?.id ?? (payload as any)?.params?.orderId ?? '';
    const userId = payload?.user?.sub ?? '';
    return this.estimationService.confirmEstimation(estimationId, userId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_FIND_ACCEPTED_DELIVERY)
  findAcceptedDeliveryEstimations(@Payload() payload: { user?: { sub?: string } }) {
    const userId = payload?.user?.sub ?? '';
    return this.estimationService.findAcceptedDeliveryEstimations(userId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_FIND_ESTIMATED_DELIVERY)
  findEstimatedDeliveryEstimations(@Payload() payload: { user?: { sub?: string } }) {
    const userId = payload?.user?.sub ?? '';
    return this.estimationService.findEstimatedDeliveryEstimations(userId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_MARK_PAID)
  markEstimationPaid(@Payload() payload: { params: { id: string } }) {
    const estimationId = payload?.params?.id ?? (payload as any)?.params?.estimationId ?? '';
    return this.estimationService.markEstimationPaid(estimationId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_FIND_ONE)
  findEstimationById(@Payload() payload: { params: { id: string } }) {
    const estimationId = payload?.params?.id ?? (payload as any)?.params?.estimationId ?? '';
    return this.estimationService.findEstimationById(estimationId);
  }
}
