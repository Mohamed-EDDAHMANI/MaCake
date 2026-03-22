import {
  Controller,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ORDERS_PATTERNS } from '../../messaging';
import { ValidatedBody } from '../../common/decorators/validated-body.decorator';
import { CreateEstimationDto } from '../dto/create-estimation.dto';
import { ClientCreateEstimationUseCase } from '../../application/use-cases/estimation/client-create-estimation.use-case';
import { DeliveryCreateEstimationUseCase } from '../../application/use-cases/estimation/delivery-create-estimation.use-case';
import { ConfirmEstimationUseCase } from '../../application/use-cases/estimation/confirm-estimation.use-case';
import { MarkEstimationPaidUseCase } from '../../application/use-cases/estimation/mark-estimation-paid.use-case';
import { AcceptDeliveryOfferUseCase } from '../../application/use-cases/estimation/accept-delivery-offer.use-case';
import { FindByOrderUseCase } from '../../application/use-cases/estimation/find-by-order.use-case';
import { FindPendingClientEstimationsUseCase } from '../../application/use-cases/estimation/find-pending-client-estimations.use-case';
import { FindAcceptedDeliveryEstimationsUseCase } from '../../application/use-cases/estimation/find-accepted-delivery-estimations.use-case';
import { FindEstimatedDeliveryEstimationsUseCase } from '../../application/use-cases/estimation/find-estimated-delivery-estimations.use-case';
import { FindDeliveredDeliveryEstimationsUseCase } from '../../application/use-cases/estimation/find-delivered-delivery-estimations.use-case';
import { FindEstimationByIdUseCase } from '../../application/use-cases/estimation/find-estimation-by-id.use-case';

@Controller()
export class EstimationDddController {
  constructor(
    private readonly clientCreateEstimationUseCase: ClientCreateEstimationUseCase,
    private readonly deliveryCreateEstimationUseCase: DeliveryCreateEstimationUseCase,
    private readonly confirmEstimationUseCase: ConfirmEstimationUseCase,
    private readonly markEstimationPaidUseCase: MarkEstimationPaidUseCase,
    private readonly acceptDeliveryOfferUseCase: AcceptDeliveryOfferUseCase,
    private readonly findByOrderUseCase: FindByOrderUseCase,
    private readonly findPendingClientEstimationsUseCase: FindPendingClientEstimationsUseCase,
    private readonly findAcceptedDeliveryEstimationsUseCase: FindAcceptedDeliveryEstimationsUseCase,
    private readonly findEstimatedDeliveryEstimationsUseCase: FindEstimatedDeliveryEstimationsUseCase,
    private readonly findDeliveredDeliveryEstimationsUseCase: FindDeliveredDeliveryEstimationsUseCase,
    private readonly findEstimationByIdUseCase: FindEstimationByIdUseCase,
  ) {}

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_CLIENT_CREATE)
  clientCreateEstimation(@ValidatedBody(CreateEstimationDto) dto: CreateEstimationDto) {
    return this.clientCreateEstimationUseCase.execute(dto);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_DELIVERY_CREATE)
  deliveryCreateEstimation(
    @Payload() payload: { body?: CreateEstimationDto; user?: { sub?: string } },
  ) {
    const dto = payload?.body ?? (payload as any);
    const userId = payload?.user?.sub ?? '';
    return this.deliveryCreateEstimationUseCase.execute(dto, userId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_FIND_BY_ORDER)
  findByOrder(@Payload() payload: { params: { orderId: string } }) {
    const orderId = payload?.params?.orderId ?? (payload as any)?.params?.id ?? '';
    return this.findByOrderUseCase.execute(orderId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_FIND_PENDING_CLIENT)
  findPendingClientEstimations() {
    return this.findPendingClientEstimationsUseCase.execute();
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_CONFIRM)
  confirmEstimation(
    @Payload() payload: { params: { id: string }; user?: { sub?: string } },
  ) {
    const estimationId = payload?.params?.id ?? (payload as any)?.params?.orderId ?? '';
    const userId = payload?.user?.sub ?? '';
    return this.confirmEstimationUseCase.execute(estimationId, userId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_FIND_ACCEPTED_DELIVERY)
  findAcceptedDeliveryEstimations(@Payload() payload: { user?: { sub?: string } }) {
    const userId = payload?.user?.sub ?? '';
    return this.findAcceptedDeliveryEstimationsUseCase.execute(userId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_FIND_ESTIMATED_DELIVERY)
  findEstimatedDeliveryEstimations(@Payload() payload: { user?: { sub?: string } }) {
    const userId = payload?.user?.sub ?? '';
    return this.findEstimatedDeliveryEstimationsUseCase.execute(userId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_FIND_DELIVERED_DELIVERY)
  findDeliveredDeliveryEstimations(@Payload() payload: { user?: { sub?: string } }) {
    const userId = payload?.user?.sub ?? '';
    return this.findDeliveredDeliveryEstimationsUseCase.execute(userId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_MARK_PAID)
  markEstimationPaid(@Payload() payload: { params: { id: string } }) {
    const estimationId = payload?.params?.id ?? (payload as any)?.params?.estimationId ?? '';
    return this.markEstimationPaidUseCase.execute(estimationId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_FIND_ONE)
  findEstimationById(@Payload() payload: { params: { id: string } }) {
    const estimationId = payload?.params?.id ?? (payload as any)?.params?.estimationId ?? '';
    return this.findEstimationByIdUseCase.execute(estimationId);
  }

  @MessagePattern(ORDERS_PATTERNS.ESTIMATION_ACCEPT_DELIVERY_OFFER)
  async acceptDeliveryOffer(
    @Payload() payload: { params: { id: string }; user?: { sub?: string } },
  ) {
    const estimationId = payload?.params?.id ?? (payload as any)?.params?.estimationId ?? '';
    const clientUserId = payload?.user?.sub ?? '';
    const result = await this.acceptDeliveryOfferUseCase.execute(estimationId, clientUserId);
    if (!result.success && (result as any).statusCode) {
      const msg = (result as any).message ?? 'Request failed';
      const code = (result as any).statusCode;
      if (code === 404) throw new NotFoundException(msg);
      if (code === 403) throw new ForbiddenException(msg);
      if (code === 401) throw new UnauthorizedException(msg);
      if (code === 400) throw new BadRequestException(msg);
    }
    return result;
  }
}
