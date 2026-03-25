import { Injectable, Inject } from '@nestjs/common';
import { ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import type { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { OrderStatus } from '../../../domain/value-objects/order-status.value-object';
import { Types } from 'mongoose';

@Injectable()
export class DeleteOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(orderId: string, userId: string, userRole: string) {
    if (!orderId) {
      return new ServiceError('VALIDATION_ERROR', 'Missing order id', 400, 'order-service').toJSON();
    }
    if (!Types.ObjectId.isValid(orderId)) {
      return new ServiceError('VALIDATION_ERROR', 'Invalid order id', 400, 'order-service').toJSON();
    }
    if (!userId) {
      return new ServiceError('VALIDATION_ERROR', 'Missing authenticated user id', 400, 'order-service').toJSON();
    }

    const role = (userRole ?? '').toLowerCase();
    const isPatissiere = role === 'patissiere';
    const isClient = role === 'client';

    if (!isPatissiere && !isClient) {
      return new ServiceError('FORBIDDEN', 'Only patissiere or client can delete an order', 403, 'order-service').toJSON();
    }

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      return { success: false, message: 'Order not found', data: null };
    }

    if (isPatissiere && order.patissiereId !== userId) {
      return { success: false, message: 'Order not found', data: null };
    }
    if (isClient && order.clientId !== userId) {
      return { success: false, message: 'Order not found', data: null };
    }

    if (order.status !== OrderStatus.REFUSED) {
      return { success: false, message: 'Only refused orders can be deleted', data: null };
    }

    const deletedByPatissiere = order.deletedByPatissiere || isPatissiere;
    const deletedByClient = order.deletedByClient || isClient;

    if (deletedByPatissiere && deletedByClient) {
      const deleted = await this.orderRepository.delete(orderId);
      if (!deleted) {
        return { success: false, message: 'Failed to delete order', data: null };
      }
      return { success: true, message: 'Order permanently deleted', data: null };
    }

    await this.orderRepository.update(orderId, { deletedByPatissiere, deletedByClient });
    return { success: true, message: 'Order deleted successfully', data: null };
  }
}
