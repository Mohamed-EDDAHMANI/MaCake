import { Test, TestingModule } from '@nestjs/testing';
import { CreateProductUseCase } from './create-product.use-case';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import { CategoryResolverDomainService } from '../../../domain/services/category-resolver.domain-service';
import { FILE_STORAGE_PORT } from '../../ports/file-storage.port';
import { ServiceError } from '../../../common/exceptions';

/* ─── Mock data ─────────────────────────────────────────────────────────── */

const CATEGORY_ID   = '507f1f77bcf86cd799439011';
const PATISSIERE_ID = '507f1f77bcf86cd799439022';
const PRODUCT_ID    = '507f1f77bcf86cd799439033';

const mockProductEntity = {
  id: PRODUCT_ID,
  title: 'Chocolate Cake',
  description: 'Rich chocolate cake',
  price: 120,
  isActive: true,
  categoryId: CATEGORY_ID,
  images: [],
  ingredients: [],
  personalizationOptions: {},
  patissiereId: PATISSIERE_ID,
  rating: 0,
  createdAt: new Date('2024-01-01'),
};

/* ─── Tests ─────────────────────────────────────────────────────────────── */

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;

  const mockProductRepo = {
    create: jest.fn().mockResolvedValue(mockProductEntity),
    update: jest.fn().mockResolvedValue(mockProductEntity),
  };

  const mockCategoryResolver = {
    resolve: jest.fn().mockResolvedValue(CATEGORY_ID),
  };

  const mockFileStorage = {
    uploadProductImage: jest.fn().mockResolvedValue('/files/catalog/products/img.jpg'),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateProductUseCase,
        { provide: PRODUCT_REPOSITORY,           useValue: mockProductRepo      },
        { provide: CategoryResolverDomainService, useValue: mockCategoryResolver },
        { provide: FILE_STORAGE_PORT,             useValue: mockFileStorage      },
      ],
    }).compile();

    useCase = module.get<CreateProductUseCase>(CreateProductUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  /* ── success ─────────────────────────────────────────────────────────── */

  it('should create a product and return success: true', async () => {
    const result = await useCase.execute({
      title: 'Chocolate Cake',
      description: 'Rich chocolate cake',
      price: 120,
      patissiereId: PATISSIERE_ID,
      categoryId: CATEGORY_ID,
    });

    expect(result.success).toBe(true);
    const ok = result as { success: true; data: { product: any } };
    expect(ok.data.product.id).toBe(PRODUCT_ID);
    expect(ok.data.product.title).toBe('Chocolate Cake');
  });

  it('should call productRepo.create with correct fields', async () => {
    await useCase.execute({
      title: 'Chocolate Cake',
      description: 'Rich chocolate cake',
      price: 120,
      patissiereId: PATISSIERE_ID,
      categoryId: CATEGORY_ID,
    });

    expect(mockProductRepo.create).toHaveBeenCalledTimes(1);
    const arg = mockProductRepo.create.mock.calls[0][0];
    expect(arg.title).toBe('Chocolate Cake');
    expect(arg.price).toBe(120);
    expect(arg.patissiereId).toBe(PATISSIERE_ID);
  });

  /* ── category resolution ─────────────────────────────────────────────── */

  it('should return 404 ServiceError when category does not exist', async () => {
    mockCategoryResolver.resolve.mockResolvedValueOnce(
      new ServiceError('NOT_FOUND', 'Category not found', 404, 'catalog-service'),
    );

    const result = await useCase.execute({
      title: 'Chocolate Cake', description: 'desc', price: 120,
      patissiereId: PATISSIERE_ID, categoryId: CATEGORY_ID,
    });

    expect(result.success).toBe(false);
    expect((result as any).code).toBe(404);
  });

  it('should return 400 ServiceError when neither categoryId nor categoryName given', async () => {
    mockCategoryResolver.resolve.mockResolvedValueOnce(
      new ServiceError('VALIDATION_ERROR', 'Either categoryId or categoryName must be provided.', 400, 'catalog-service'),
    );

    const result = await useCase.execute({
      title: 'Chocolate Cake', description: 'desc', price: 120,
      patissiereId: PATISSIERE_ID,
    });

    expect(result.success).toBe(false);
    expect((result as any).code).toBe(400);
  });

  it('should return 400 when title is empty (domain validation)', async () => {
    const result = await useCase.execute({
      title: '',
      description: 'desc',
      price: 120,
      patissiereId: PATISSIERE_ID,
      categoryId: CATEGORY_ID,
    });

    expect(result.success).toBe(false);
    expect((result as any).code).toBe(400);
  });

  it('should return 400 when price is negative (domain validation)', async () => {
    const result = await useCase.execute({
      title: 'Cake',
      description: 'desc',
      price: -10,
      patissiereId: PATISSIERE_ID,
      categoryId: CATEGORY_ID,
    });

    expect(result.success).toBe(false);
    expect((result as any).code).toBe(400);
  });
});
