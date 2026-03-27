import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { TopUpWalletUseCase } from './top-up-wallet.use-case';
import { ServiceError } from '../../../common/exceptions';
import { PAYMENT_REPOSITORY } from '../../../domain/repositories/payment.repository.interface';
import { AUTH_CLIENT } from '../../../messaging/constants';
import { Payment } from '../../../domain/entities/payment.entity';

describe('TopUpWalletUseCase', () => {
  let useCase: TopUpWalletUseCase;
  let mockPaymentRepository: jest.Mocked<any>;
  let mockAuthClient: jest.Mocked<any>;
  let mockConfigService: jest.Mocked<any>;

  beforeEach(async () => {
    mockPaymentRepository = {
      create: jest.fn(),
      findByStripeCheckoutSessionId: jest.fn(),
      findByStripePaymentIntentId: jest.fn(),
      updateById: jest.fn(),
    };

    mockAuthClient = {
      send: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('test-stripe-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopUpWalletUseCase,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PAYMENT_REPOSITORY, useValue: mockPaymentRepository },
        { provide: AUTH_CLIENT, useValue: mockAuthClient },
      ],
    }).compile();

    useCase = module.get<TopUpWalletUseCase>(TopUpWalletUseCase);
  });

  describe('execute()', () => {
    it('should return ServiceError with code 401 when clientId is empty', async () => {
      const dto = { amount: 100 };
      const result = await useCase.execute('', dto as any);

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(401);
      expect((result as ServiceError).errorType).toBe('UNAUTHORIZED');
    });

    it('should return ServiceError when amount is zero', async () => {
      const dto = { amount: 0 };
      const result = await useCase.execute('client-id-001', dto as any);

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(400);
      expect((result as ServiceError).errorType).toBe('VALIDATION_ERROR');
    });

    it('should return ServiceError when amount is negative', async () => {
      const dto = { amount: -50 };
      const result = await useCase.execute('client-id-001', dto as any);

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(400);
      expect((result as ServiceError).errorType).toBe('VALIDATION_ERROR');
    });

    it('should return ServiceError when STRIPE_SECRET_KEY is missing', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const dto = { amount: 100 };
      const result = await useCase.execute('client-id-001', dto as any);

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(500);
      expect((result as ServiceError).errorType).toBe('CONFIGURATION_ERROR');
    });
  });

  describe('confirmWalletTopUp()', () => {
    it('should return ServiceError with code 401 when clientId is empty', async () => {
      const result = await useCase.confirmWalletTopUp('', 'pi_test_123');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(401);
      expect((result as ServiceError).errorType).toBe('UNAUTHORIZED');
    });

    it('should return ServiceError when paymentIntentId is empty', async () => {
      const result = await useCase.confirmWalletTopUp('client-id-001', '');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(400);
      expect((result as ServiceError).errorType).toBe('VALIDATION_ERROR');
    });

    it('should return ServiceError when payment not found', async () => {
      mockPaymentRepository.findByStripePaymentIntentId.mockResolvedValue(null);

      const result = await useCase.confirmWalletTopUp('client-id-001', 'pi_nonexistent');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(404);
      expect((result as ServiceError).errorType).toBe('NOT_FOUND');
    });

    it('should return success when payment is already released', async () => {
      const releasedPayment = new Payment(
        'payment-id-001', null, null, 'client-id-001', 100, 'stripe_card', 'released',
        'pi_test_123',
      );
      mockPaymentRepository.findByStripePaymentIntentId.mockResolvedValue(releasedPayment);

      const result = await useCase.confirmWalletTopUp('client-id-001', 'pi_test_123');

      expect(result).not.toBeInstanceOf(ServiceError);
      expect((result as any).success).toBe(true);
    });

    it('should return ServiceError when payment is refunded', async () => {
      const refundedPayment = new Payment(
        'payment-id-001', null, null, 'client-id-001', 100, 'stripe_card', 'refunded',
        'pi_test_123',
      );
      mockPaymentRepository.findByStripePaymentIntentId.mockResolvedValue(refundedPayment);

      const result = await useCase.confirmWalletTopUp('client-id-001', 'pi_test_123');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(409);
      expect((result as ServiceError).errorType).toBe('CONFLICT');
    });

    it('should return ServiceError when clientId does not match payment owner', async () => {
      const otherClientPayment = new Payment(
        'payment-id-001', null, null, 'other-client-id', 100, 'stripe_card', 'blocked',
        'pi_test_123',
      );
      mockPaymentRepository.findByStripePaymentIntentId.mockResolvedValue(otherClientPayment);

      const result = await useCase.confirmWalletTopUp('client-id-001', 'pi_test_123');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(403);
      expect((result as ServiceError).errorType).toBe('FORBIDDEN');
    });
  });

  describe('releaseWalletTopUp()', () => {
    it('should return ServiceError when session not found', async () => {
      mockPaymentRepository.findByStripeCheckoutSessionId.mockResolvedValue(null);

      const result = await useCase.releaseWalletTopUp('cs_nonexistent');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(404);
      expect((result as ServiceError).errorType).toBe('NOT_FOUND');
    });

    it('should return success when top up is already released', async () => {
      const releasedPayment = new Payment(
        'payment-id-001', null, null, 'client-id-001', 100, 'stripe_card', 'released',
        undefined, 'cs_test_123',
      );
      mockPaymentRepository.findByStripeCheckoutSessionId.mockResolvedValue(releasedPayment);

      const result = await useCase.releaseWalletTopUp('cs_test_123');

      expect(result).not.toBeInstanceOf(ServiceError);
      expect((result as any).success).toBe(true);
    });

    it('should return ServiceError when top up payment is refunded', async () => {
      const refundedPayment = new Payment(
        'payment-id-001', null, null, 'client-id-001', 100, 'stripe_card', 'refunded',
        undefined, 'cs_test_123',
      );
      mockPaymentRepository.findByStripeCheckoutSessionId.mockResolvedValue(refundedPayment);

      const result = await useCase.releaseWalletTopUp('cs_test_123');

      expect(result).toBeInstanceOf(ServiceError);
      expect((result as ServiceError).code).toBe(409);
      expect((result as ServiceError).errorType).toBe('CONFLICT');
    });

    it('should release and top up wallet when payment is blocked', async () => {
      const blockedPayment = new Payment(
        'payment-id-001', null, null, 'client-id-001', 100, 'stripe_card', 'blocked',
        undefined, 'cs_test_123',
      );
      const updatedPayment = new Payment(
        'payment-id-001', null, null, 'client-id-001', 100, 'stripe_card', 'released',
        'pi_test_123', 'cs_test_123',
      );

      mockPaymentRepository.findByStripeCheckoutSessionId.mockResolvedValue(blockedPayment);
      mockPaymentRepository.updateById.mockResolvedValue(updatedPayment);

      mockAuthClient.send.mockReturnValue(of({ data: { walletBalance: 250 } }));

      const result = await useCase.releaseWalletTopUp('cs_test_123', 'pi_test_123');

      expect(result).not.toBeInstanceOf(ServiceError);
      expect((result as any).success).toBe(true);
      expect((result as any).data.walletBalance).toBe(250);
      expect(mockPaymentRepository.updateById).toHaveBeenCalledWith(
        'payment-id-001',
        expect.objectContaining({ status: 'released' }),
      );
    });
  });
});
