import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CreateOrderUseCase } from './create-order.use-case';
import { ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import { OrderStatus } from '../../../domain/value-objects/order-status.value-object';

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

const mockConfigService = {
  get: jest.fn().mockReturnValue(null),
};

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderUseCase,
        { provide: ORDER_REPOSITORY, useValue: mockOrderRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    useCase = module.get<CreateOrderUseCase>(CreateOrderUseCase);
    jest.clearAllMocks();
  });

  const validPayload = {
    clientId: 'client-123',
    patissiereId: 'patissiere-456',
    patissiereAddress: '123 Rue de la Pâtisserie',
    deliveryAddress: '456 Avenue du Client',
    deliveryAddressSource: 'profile' as const,
    deliveryLatitude: 33.9716,
    deliveryLongitude: -6.8498,
    patissiereLatitude: 33.9900,
    patissiereLongitude: -6.8600,
    requestedDateTime: new Date(Date.now() + 3600000).toISOString(),
    totalPrice: 150,
    items: [
      { productId: 'prod-1', quantity: 2, priceAtPurchase: 75 },
    ],
  };

  describe('execute - success', () => {
    it('should create order with correct fields and return success response', async () => {
      const createdOrder = {
        id: 'order-789',
        clientId: 'client-123',
        patissiereId: 'patissiere-456',
        patissiereAddress: '123 Rue de la Pâtisserie',
        deliveryAddress: '456 Avenue du Client',
        deliveryAddressSource: 'profile',
        deliveryLatitude: 33.9716,
        deliveryLongitude: -6.8498,
        patissiereLatitude: 33.9900,
        patissiereLongitude: -6.8600,
        requestedDateTime: new Date(validPayload.requestedDateTime),
        totalPrice: 150,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      };

      mockOrderRepository.create.mockResolvedValue(createdOrder);

      const result = await useCase.execute(validPayload);

      expect(result).toMatchObject({
        success: true,
        message: 'Order created successfully',
        data: expect.objectContaining({
          id: 'order-789',
          clientId: 'client-123',
          patissiereId: 'patissiere-456',
          totalPrice: 150,
          status: OrderStatus.PENDING,
        }),
      });

      expect(mockOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client-123',
          patissiereId: 'patissiere-456',
          totalPrice: 150,
        }),
      );
    });
  });

  describe('execute - validation errors', () => {
    it('should return error when totalPrice is negative', async () => {
      const result = await useCase.execute({ ...validPayload, totalPrice: -10 });

      expect((result as any).success).toBe(false);
      expect((result as any).error.code).toBe(400);
      expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });

    it('should return error when clientId is empty', async () => {
      const result = await useCase.execute({ ...validPayload, clientId: '' });

      expect((result as any).success).toBe(false);
      expect((result as any).error.code).toBe(400);
      expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });

    it('should return error when patissiereId is empty', async () => {
      const result = await useCase.execute({ ...validPayload, patissiereId: '' });

      expect((result as any).success).toBe(false);
      expect((result as any).error.code).toBe(400);
      expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });

    it('should return error when requestedDateTime is invalid', async () => {
      const result = await useCase.execute({ ...validPayload, requestedDateTime: 'invalid-date' });

      expect((result as any).success).toBe(false);
      expect((result as any).error.code).toBe(400);
      expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });
  });
});
