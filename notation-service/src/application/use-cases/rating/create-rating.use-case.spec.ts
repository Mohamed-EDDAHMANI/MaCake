import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CreateRatingUseCase } from './create-rating.use-case';
import { RATING_REPOSITORY } from '../../../domain/repositories/rating.repository.interface';
import { ServiceError } from '../../../common/exceptions';

const mockRatingRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  findByUser: jest.fn(),
  findByProduct: jest.fn(),
  getAverageForUser: jest.fn(),
  getAverageForUsers: jest.fn(),
  existsByOrder: jest.fn(),
  delete: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('http://gateway:3000/ratings'),
};

// Mock socket.io-client to avoid real connections in tests
jest.mock('socket.io-client', () => ({
  io: jest.fn().mockReturnValue({
    emit: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

describe('CreateRatingUseCase', () => {
  let useCase: CreateRatingUseCase;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRatingUseCase,
        { provide: RATING_REPOSITORY, useValue: mockRatingRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    useCase = module.get<CreateRatingUseCase>(CreateRatingUseCase);
  });

  it('should create a rating successfully with valid stars', async () => {
    mockRatingRepository.findOne.mockResolvedValueOnce(null);
    mockRatingRepository.create.mockResolvedValueOnce({
      id: 'rating-1',
      fromUserId: 'user-1',
      toUserId: 'user-2',
      orderId: 'order-1',
      productId: null,
      stars: 5,
      comment: 'Great!',
      createdAt: new Date(),
    });

    const result = await useCase.execute({
      fromUserId: 'user-1',
      toUserId: 'user-2',
      orderId: 'order-1',
      stars: 5,
      comment: 'Great!',
    });

    expect(result).not.toBeInstanceOf(ServiceError);
    expect((result as any).success).toBe(true);
    expect(mockRatingRepository.create).toHaveBeenCalledTimes(1);
  });

  it('should return validation error when stars = 0', async () => {
    const result = await useCase.execute({
      fromUserId: 'user-1',
      toUserId: 'user-2',
      orderId: 'order-1',
      stars: 0,
    });

    expect(result).toBeInstanceOf(ServiceError);
    expect((result as ServiceError).code).toBe(400);
    expect(mockRatingRepository.create).not.toHaveBeenCalled();
  });

  it('should return validation error when stars = 6', async () => {
    const result = await useCase.execute({
      fromUserId: 'user-1',
      toUserId: 'user-2',
      orderId: 'order-1',
      stars: 6,
    });

    expect(result).toBeInstanceOf(ServiceError);
    expect((result as ServiceError).code).toBe(400);
    expect(mockRatingRepository.create).not.toHaveBeenCalled();
  });

  it('should return validation error when fromUserId is empty', async () => {
    const result = await useCase.execute({
      fromUserId: '',
      toUserId: 'user-2',
      orderId: 'order-1',
      stars: 4,
    });

    expect(result).toBeInstanceOf(ServiceError);
    expect((result as ServiceError).code).toBe(400);
    expect(mockRatingRepository.create).not.toHaveBeenCalled();
  });

  it('should return validation error when neither orderId nor productId is provided', async () => {
    const result = await useCase.execute({
      fromUserId: 'user-1',
      toUserId: 'user-2',
      stars: 4,
    });

    expect(result).toBeInstanceOf(ServiceError);
    expect((result as ServiceError).code).toBe(400);
  });

  it('should return conflict error when rating already exists', async () => {
    mockRatingRepository.findOne.mockResolvedValueOnce({ id: 'existing-rating' });

    const result = await useCase.execute({
      fromUserId: 'user-1',
      toUserId: 'user-2',
      orderId: 'order-1',
      stars: 4,
    });

    expect(result).toBeInstanceOf(ServiceError);
    expect((result as ServiceError).code).toBe(409);
    expect(mockRatingRepository.create).not.toHaveBeenCalled();
  });
});
