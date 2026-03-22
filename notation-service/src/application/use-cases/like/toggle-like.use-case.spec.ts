import { Test, TestingModule } from '@nestjs/testing';
import { ToggleLikeUseCase } from './toggle-like.use-case';
import { LIKE_REPOSITORY } from '../../../domain/repositories/like.repository.interface';
import { CATALOG_CLIENT } from '../../../messaging/constants';
import { ServiceError } from '../../../common/exceptions';
import { Like } from '../../../domain/entities/like.entity';

const mockLikeRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  countByProduct: jest.fn(),
  countByProducts: jest.fn(),
  findLikerIdsByProducts: jest.fn(),
  findByUser: jest.fn(),
};

const mockCatalogClient = {
  emit: jest.fn(),
};

describe('ToggleLikeUseCase', () => {
  let useCase: ToggleLikeUseCase;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToggleLikeUseCase,
        { provide: LIKE_REPOSITORY, useValue: mockLikeRepository },
        { provide: CATALOG_CLIENT, useValue: mockCatalogClient },
      ],
    }).compile();

    useCase = module.get<ToggleLikeUseCase>(ToggleLikeUseCase);
  });

  it('should add a like when it does not exist (toggle on)', async () => {
    mockLikeRepository.findOne.mockResolvedValueOnce(null);
    mockLikeRepository.create.mockResolvedValueOnce(
      Like.reconstitute({ id: 'like-1', userId: 'user-1', productId: 'product-1' }),
    );
    mockLikeRepository.countByProduct.mockResolvedValueOnce(5);

    const result = await useCase.execute('user-1', 'product-1');

    expect(result).not.toBeInstanceOf(ServiceError);
    expect((result as any).success).toBe(true);
    expect((result as any).data.liked).toBe(true);
    expect((result as any).data.count).toBe(5);
    expect(mockLikeRepository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      productId: 'product-1',
    });
    expect(mockCatalogClient.emit).toHaveBeenCalledWith('like.toggled', {
      productId: 'product-1',
      likesCount: 5,
    });
  });

  it('should remove a like when it exists (toggle off)', async () => {
    const existingLike = Like.reconstitute({
      id: 'like-1',
      userId: 'user-1',
      productId: 'product-1',
    });
    mockLikeRepository.findOne.mockResolvedValueOnce(existingLike);
    mockLikeRepository.delete.mockResolvedValueOnce(true);
    mockLikeRepository.countByProduct.mockResolvedValueOnce(3);

    const result = await useCase.execute('user-1', 'product-1');

    expect(result).not.toBeInstanceOf(ServiceError);
    expect((result as any).success).toBe(true);
    expect((result as any).data.liked).toBe(false);
    expect((result as any).data.count).toBe(3);
    expect(mockLikeRepository.delete).toHaveBeenCalledWith('user-1', 'product-1');
    expect(mockCatalogClient.emit).toHaveBeenCalledWith('like.toggled', {
      productId: 'product-1',
      likesCount: 3,
    });
  });

  it('should return a ServiceError when repository throws', async () => {
    mockLikeRepository.findOne.mockRejectedValueOnce(new Error('DB connection failed'));

    const result = await useCase.execute('user-1', 'product-1');

    expect(result).toBeInstanceOf(ServiceError);
    expect((result as ServiceError).code).toBe(500);
  });
});
