import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClientCreateEstimationUseCase } from './client-create-estimation.use-case';
import { ESTIMATION_REPOSITORY } from '../../../domain/repositories/estimation.repository.interface';
import { ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import { StartDeliveryUseCase } from '../order/start-delivery.use-case';
import { EstimationStatus, EstimationUserRole } from '../../../domain/entities/estimation.entity';
import { OrderStatus } from '../../../domain/value-objects/order-status.value-object';

const mockEstimationRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByOrderId: jest.fn(),
  findPendingForDelivery: jest.fn(),
  findAcceptedByDelivery: jest.fn(),
  findEstimatedByDelivery: jest.fn(),
  findDeliveredByDelivery: jest.fn(),
  update: jest.fn(),
  findRawById: jest.fn(),
  findRawByOrderIdAndRole: jest.fn(),
  saveRaw: jest.fn(),
};

const mockOrderRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByClientId: jest.fn(),
  findByPatissiereId: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByIdForInternal: jest.fn(),
  findWithItemsById: jest.fn(),
};

const mockStartDeliveryUseCase = {
  execute: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue(null),
};

describe('ClientCreateEstimationUseCase', () => {
  let useCase: ClientCreateEstimationUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientCreateEstimationUseCase,
        { provide: ESTIMATION_REPOSITORY, useValue: mockEstimationRepository },
        { provide: ORDER_REPOSITORY, useValue: mockOrderRepository },
        { provide: StartDeliveryUseCase, useValue: mockStartDeliveryUseCase },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    useCase = module.get<ClientCreateEstimationUseCase>(ClientCreateEstimationUseCase);
    jest.clearAllMocks();
  });

  const validPayload = {
    orderId: '507f1f77bcf86cd799439011',
    details: 'Please deliver fast',
    price: 50,
  };

  describe('execute - success', () => {
    it('should create estimation and return success response', async () => {
      const createdEstimation = {
        id: 'est-123',
        orderId: validPayload.orderId,
        details: validPayload.details,
        price: validPayload.price,
        userRole: EstimationUserRole.CLIENT,
        status: EstimationStatus.PENDING,
        createdBy: null,
        acceptedBy: null,
        paidAt: null,
        createdAt: new Date(),
      };

      mockEstimationRepository.create.mockResolvedValue(createdEstimation);
      mockOrderRepository.findByIdForInternal.mockResolvedValue({
        clientId: 'client-123',
        status: OrderStatus.ACCEPTED,
      });

      const result = await useCase.execute(validPayload);

      expect(result).toMatchObject({
        success: true,
        message: 'Client estimation created',
        data: expect.objectContaining({
          id: 'est-123',
          orderId: validPayload.orderId,
          price: 50,
          status: EstimationStatus.PENDING,
        }),
      });

      expect(mockEstimationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: validPayload.orderId,
          details: validPayload.details,
          price: 50,
          userRole: EstimationUserRole.CLIENT,
        }),
      );
    });

    it('should trigger startDelivery when order is in COMPLETED status', async () => {
      const createdEstimation = {
        id: 'est-456',
        orderId: validPayload.orderId,
        details: validPayload.details,
        price: validPayload.price,
        userRole: EstimationUserRole.CLIENT,
        status: EstimationStatus.PENDING,
        createdBy: null,
        acceptedBy: null,
        paidAt: null,
        createdAt: new Date(),
      };

      mockEstimationRepository.create.mockResolvedValue(createdEstimation);
      mockOrderRepository.findByIdForInternal.mockResolvedValue({
        clientId: 'client-123',
        status: OrderStatus.COMPLETED,
      });
      mockStartDeliveryUseCase.execute.mockResolvedValue({ success: true });

      await useCase.execute(validPayload);

      expect(mockStartDeliveryUseCase.execute).toHaveBeenCalledWith(
        validPayload.orderId,
        'client-123',
      );
    });
  });

  describe('execute - validation errors', () => {
    it('should return error when price is negative', async () => {
      const result = await useCase.execute({ ...validPayload, price: -5 });

      expect((result as any).success).toBe(false);
      expect((result as any).error.code).toBe(400);
      expect(mockEstimationRepository.create).not.toHaveBeenCalled();
    });

    it('should return error when price is NaN', async () => {
      const result = await useCase.execute({ ...validPayload, price: NaN });

      expect((result as any).success).toBe(false);
      expect((result as any).error.code).toBe(400);
      expect(mockEstimationRepository.create).not.toHaveBeenCalled();
    });

    it('should allow price of 0', async () => {
      const createdEstimation = {
        id: 'est-789',
        orderId: validPayload.orderId,
        details: validPayload.details,
        price: 0,
        userRole: EstimationUserRole.CLIENT,
        status: EstimationStatus.PENDING,
        createdBy: null,
        acceptedBy: null,
        paidAt: null,
        createdAt: new Date(),
      };

      mockEstimationRepository.create.mockResolvedValue(createdEstimation);
      mockOrderRepository.findByIdForInternal.mockResolvedValue({
        clientId: 'client-123',
        status: OrderStatus.PENDING,
      });

      const result = await useCase.execute({ ...validPayload, price: 0 });

      expect((result as any).success).toBe(true);
      expect(mockEstimationRepository.create).toHaveBeenCalled();
    });
  });
});
