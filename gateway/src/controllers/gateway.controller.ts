import { Controller, All, Param, Req, Res, Logger, HttpStatus } from '@nestjs/common';
import express from 'express';
import { GatewayForwardService } from '../common/gateway-forward.service';
import { ErrorHandlerService } from '../common/error-handler.service';
import {
  successResponse,
  errorResponse,
  isApiResponse,
  ApiResponse,
} from '../common/interfaces/api-response.interface';
import { OrderEventsGateway } from '../gateways/order-events.gateway';
import { PaymentEventsGateway } from '../gateways/payment-events.gateway';

@Controller()
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(
    private readonly forwardService: GatewayForwardService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly orderEventsGateway: OrderEventsGateway,
    private readonly paymentEventsGateway: PaymentEventsGateway,
  ) {}

  @All('health')
  healthCheck(@Res() res: express.Response): void {
    const response = successResponse(
      { status: 'healthy' },
      'Service is healthy' ,
      { statusCode: HttpStatus.OK, path: '/health' },
    );
    res.status(response.statusCode).json(response);
  }

  @All(':service/*')
  async forward(
    @Param('service') service: string,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ): Promise<void> {
    const path = (req.originalUrl && req.originalUrl.split('?')[0]) || req.url || '';

    try {
      // Use path-only for pattern so query params (e.g. ?patissiereId=) don't break microservice route matching
      const pattern = path.replace(`/${service}/`, '');
      const id = pattern.split('/').pop() || '';
      req.params = { id };
      const payload = this.forwardService.buildPayload(req);

      let response = await this.forwardService.forwardRequest(service, pattern, payload);

      if (req.originalUrl.includes('s1/auth/refresh') || req.originalUrl.includes('s1/auth/login') || req.originalUrl.includes('s1/auth/register')) {
        response = this.forwardService.handleRefreshToken(response, res);
      }

      if (response?.success === false) {
        const status = response.statusCode ?? response.error?.code ?? HttpStatus.BAD_REQUEST;
        this.logger.warn(`Microservice returned error: ${response.message || 'Unknown error'}`);
        const apiError = errorResponse(
          status,
          response.message || 'Operation failed',
          response.errors ?? null,
          { path },
        );
        res.status(apiError.statusCode).json(apiError);
        return;
      }

      const status = this.forwardService.getResponseStatus(response);
      const body: ApiResponse = isApiResponse(response)
        ? { ...response, path, timestamp: new Date().toISOString() }
        : successResponse(response?.data ?? response, response?.message ?? 'Request successful', {
            statusCode: status,
            meta: response?.meta ?? null,
            path,
          });

      // s3 (order-service): emit order.status.changed
      if (service === 's3' && body?.data) {
        const data = body.data as any;
        const emitForOrder = (order: any) => {
          if (order && typeof order.id === 'string' && typeof order.status === 'string') {
            this.orderEventsGateway.emitOrderStatusChanged({
              orderId: order.id,
              status: order.status,
            });
          }
        };

        if (Array.isArray(data)) {
          data.forEach(emitForOrder);
        } else if (Array.isArray((data as any).data)) {
          (data as any).data.forEach(emitForOrder);
        } else {
          emitForOrder(data);
        }
      }

      // s5 (payment-service): emit wallet.changed, payment.confirmed, estimation.paid
      if (service === 's5' && body?.data) {
        const d = body.data as any;

        // order payment confirmed → notify client
        if (d?.payment?.orderId && d?.payment?.clientId && !d?.payment?.estimationId) {
          this.paymentEventsGateway.emitPaymentConfirmed({
            orderId: d.payment.orderId,
            clientId: d.payment.clientId,
            amount: d.payment.amount ?? 0,
          });
        }

        // delivery payment released → notify delivery driver (estimation.paid)
        if (d?.payment?.estimationId && d?.payment?.clientId && d?.payment?.status === 'released') {
          this.paymentEventsGateway.emitEstimationPaid({
            estimationId: d.payment.estimationId,
            clientId: d.payment.clientId,
            deliveryUserId: d.deliveryUserId ?? '',
            amount: d.payment.amount ?? 0,
          });
          // wallet balance for delivery driver
          if (d?.deliveryUserId && d?.deliveryNetAmount !== undefined) {
            this.paymentEventsGateway.emitWalletChanged({
              userId: d.deliveryUserId,
              walletBalance: Number(d.deliveryNetAmount),
            });
          }
        }

        // wallet balance changes for client (order or delivery payment)
        if (d?.walletBalance !== undefined && d?.payment?.clientId) {
          this.paymentEventsGateway.emitWalletChanged({
            userId: d.payment.clientId,
            walletBalance: Number(d.walletBalance),
          });
        }

        // wallet balance changes for patissiere (order payment)
        if (d?.patissiereWalletBalance !== undefined && d?.patissiereId) {
          this.paymentEventsGateway.emitWalletChanged({
            userId: d.patissiereId,
            walletBalance: Number(d.patissiereWalletBalance),
          });
        }
      }

      // s6 (notation-service): emit like.toggled
      // Note: like service returns { liked, count } without productId — take it from request body
      if (service === 's6' && body?.data) {
        const d = body.data as any;
        const productId = d?.productId ?? (payload as any)?.body?.productId;
        if (productId && d?.liked !== undefined && d?.count !== undefined) {
          this.paymentEventsGateway.emitLikeToggled({
            productId,
            liked: Boolean(d.liked),
            count: Number(d.count),
          });
        }
      }

      res.status(body.statusCode).json(body);
    } catch (error) {
      this.errorHandler.handleError(error, res, path);
    }
  }
}
