import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { CreatePaymentUseCase } from './create-payment.use-case';
import { ServiceError } from '../../../common/exceptions';
import { PAYMENT_REPOSITORY } from '../../../domain/repositories/payment.repository.interface';
import { TRANSACTION_REPOSITORY } from '../../../domain/repositories/transaction.repository.interface';
import { COMMISSION_REPOSITORY } from '../../../domain/repositories/commission.repository.interface';
import { AUTH_CLIENT, ORDERS_CLIENT } from '../../../messaging/constants';
import { Payment } from '../../../domain/entities/payment.entity';

const makePayment = (): Payment =>
  new Payment(
    'payment-id-001',
    'order-id-001',
    null,
    'client-id-001',
    120,
    'wallet',
    'released',
  );

describe('CreatePaymentUseCase', () => {
  let useCase: CreatePaymentUseCase;
  let mockPaymentRepository: jest.Mocked<any>;
  let mockTransactionRepository: jest.Mocked<any>;
  let mockCommissionRepository: jest.Mocked<any>;
  let mockOrdersClient: jest.Mocked<any>;
  let mockAuthClient: jest.Mocked<any>;

  const validOrder = {
    orderId: 'order-id-001',
    clientId: 'client-id-001',
    patissiereId: 'patissiere-id-001',
    totalPrice: 120,
  };

  beforeEach(async () => {
    mockPaymentRepository = {
      create: jest.fn(),
      findByStripeCheckoutSessionId: jest.fn(),
      findByStripePaymentIntentId: jest.fn(),
      updateById: jest.fn(),
    };

    mockTransactionRepository = {
      create: jest.fn().mockResolvedValue({}),
    };

    mockCommissionRepository = {
      create: jest.fn().mockResolvedValue({}),
    };

    mockOrdersClient = {
      send: jest.fn(),
    };

    mockAuthClient = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePaymentUseCase,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-stripe-key') },
        },
        { provide: PAYMENT_REPOSITORY, useValue: mockPaymentRepository },
        { provide: TRANSACTION_REPOSITORY, useValue: mockTransactionRepository },
        { provide: COMMISSION_REPOSITORY, useValue: mockCommissionRepository },
        { provide: ORDERS_CLIENT, useValue: mockOrdersClient },
        { provide: AUTH_CLIENT, useValue: mockAuthClient },
      ],
    }).compile();

    useCase = module.get<CreatePaymentUseCase>(CreatePaymentUseCase);
  });

  describe('execute()', () => {
    it('should return ServiceError with code 401 when requesterId is empty', async () => {
      const dto = { orderId: 'order-id-001', paymentMethod: 'wallet' as const };
      const result = await useCase.execute(dto as any, '');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(401);
      expect((result as ServiceError).errorType).toBe('UNAUTHORIZED');
    });

    it('should return ServiceError when order is not found', async () => {
      mockOrdersClient.send.mockReturnValue(of(null));

      const dto = { orderId: 'nonexistent-order', paymentMethod: 'wallet' as const };
      const result = await useCase.execute(dto as any, 'client-id-001');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(404);
      expect((result as ServiceError).errorType).toBe('NOT_FOUND');
    });

    it('should return ServiceError when order response throws', async () => {
      mockOrdersClient.send.mockReturnValue(
        new (require('rxjs').Observable)((observer: any) => {
          observer.error(new Error('Connection failed'));
        }),
      );

      const dto = { orderId: 'order-id-001', paymentMethod: 'wallet' as const };
      const result = await useCase.execute(dto as any, 'client-id-001');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(404);
    });

    it('should execute wallet payment successfully', async () => {
      // mock getOrder
      mockOrdersClient.send.mockReturnValue(of({ data: validOrder }));

      // mock getPlatformUserId (auth/platform-account)
      mockAuthClient.send.mockImplementation((pattern: string) => {
        if (pattern === 'auth/platform-account') {
          return of({ data: { user: { id: 'platform-user-id' } } });
        }
        if (pattern === 'auth/wallet/debit') {
          return of({ data: { walletBalance: 500 } });
        }
        if (pattern === 'auth/wallet/topup') {
          return of({ data: { walletBalance: 600 } });
        }
        return of({ data: {} });
      });

      // mock order update status
      mockOrdersClient.send.mockImplementation((pattern: string) => {
        if (pattern === 'orders/find-one') {
          return of({ data: validOrder });
        }
        if (pattern === 'orders/update-status') {
          return of({ success: true });
        }
        return of({ data: {} });
      });

      mockPaymentRepository.create.mockResolvedValue(makePayment());

      const dto = {
        orderId: 'order-id-001',
        paymentMethod: 'wallet' as const,
      };
      const result = await useCase.execute(dto as any, 'client-id-001');

      expect(result).not.toBeInstanceOf(ServiceError);
      expect((result as any).success).toBe(true);
      expect(mockPaymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-id-001',
          clientId: 'client-id-001',
          amount: 120,
          paymentMethod: 'wallet',
          status: 'released',
        }),
      );
    });

    it('should return ServiceError when wallet debit fails', async () => {
      mockOrdersClient.send.mockImplementation((pattern: string) => {
        if (pattern === 'orders/find-one') return of({ data: validOrder });
        return of({ success: true });
      });

      mockAuthClient.send.mockImplementation((pattern: string) => {
        if (pattern === 'auth/platform-account') {
          return of({ data: { user: { id: 'platform-user-id' } } });
        }
        if (pattern === 'auth/wallet/debit') {
          return new (require('rxjs').Observable)((observer: any) => {
            observer.error(new Error('Insufficient funds'));
          });
        }
        return of({ data: {} });
      });

      const dto = { orderId: 'order-id-001', paymentMethod: 'wallet' as const };
      const result = await useCase.execute(dto as any, 'client-id-001');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(400);
    });

    it('should return ServiceError when order has no clientId', async () => {
      mockOrdersClient.send.mockReturnValue(
        of({ data: { orderId: 'order-id-001', totalPrice: 120, patissiereId: 'pat-id' } }),
      );

      const dto = { orderId: 'order-id-001', paymentMethod: 'wallet' as const };
      const result = await useCase.execute(dto as any, 'client-id-001');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(400);
      expect((result as ServiceError).errorType).toBe('VALIDATION_ERROR');
    });

    it('should return ServiceError when order amount is zero', async () => {
      mockOrdersClient.send.mockReturnValue(
        of({ data: { ...validOrder, totalPrice: 0 } }),
      );

      const dto = { orderId: 'order-id-001', paymentMethod: 'wallet' as const };
      const result = await useCase.execute(dto as any, 'client-id-001');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(400);
      expect((result as ServiceError).errorType).toBe('VALIDATION_ERROR');
    });
  });

  describe('confirmStripePayment()', () => {
    it('should return ServiceError when paymentIntentId is empty', async () => {
      const result = await useCase.confirmStripePayment('client-id-001', '');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(400);
      expect((result as ServiceError).errorType).toBe('VALIDATION_ERROR');
    });

    it('should return ServiceError when payment not found', async () => {
      mockPaymentRepository.findByStripePaymentIntentId.mockResolvedValue(null);

      const result = await useCase.confirmStripePayment('client-id-001', 'pi_nonexistent');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(404);
      expect((result as ServiceError).errorType).toBe('NOT_FOUND');
    });

    it('should return success when payment is already released', async () => {
      const releasedPayment = new Payment(
        'payment-id-001', 'order-id-001', null, 'client-id-001', 120, 'stripe_card', 'released',
        'pi_test_123',
      );
      mockPaymentRepository.findByStripePaymentIntentId.mockResolvedValue(releasedPayment);

      const result = await useCase.confirmStripePayment('client-id-001', 'pi_test_123');

      expect(result).not.toBeInstanceOf(ServiceError);
      expect((result as any).success).toBe(true);
    });

    it('should return ServiceError when payment is refunded', async () => {
      const refundedPayment = new Payment(
        'payment-id-001', 'order-id-001', null, 'client-id-001', 120, 'stripe_card', 'refunded',
        'pi_test_123',
      );
      mockPaymentRepository.findByStripePaymentIntentId.mockResolvedValue(refundedPayment);

      const result = await useCase.confirmStripePayment('client-id-001', 'pi_test_123');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(409);
      expect((result as ServiceError).errorType).toBe('CONFLICT');
    });

    it('should return ServiceError when requester is not the payment owner', async () => {
      const blockedPayment = new Payment(
        'payment-id-001', 'order-id-001', null, 'other-client-id', 120, 'stripe_card', 'blocked',
        'pi_test_123',
      );
      mockPaymentRepository.findByStripePaymentIntentId.mockResolvedValue(blockedPayment);

      const result = await useCase.confirmStripePayment('client-id-001', 'pi_test_123');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(403);
      expect((result as ServiceError).errorType).toBe('FORBIDDEN');
    });
  });
});
