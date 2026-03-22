import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { FindAllProductsUseCase } from './find-all-products.use-case';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import { AUTH_CLIENT, NOTATION_CLIENT } from '../../../messaging';

/* ─── Mock data ─────────────────────────────────────────────────────────── */

const PATISSIERE_ID = '507f1f77bcf86cd799439022';
const PRODUCT_ID    = '507f1f77bcf86cd799439033';
const CATEGORY_ID   = '507f1f77bcf86cd799439011';

const mockProductEntity = {
  id: PRODUCT_ID,
  title: 'Chocolate Cake',
  description: 'Rich chocolate cake',
  price: 120,
  isActive: true,
  categoryId: CATEGORY_ID,
  category: { id: CATEGORY_ID, name: 'Birthday' },
  images: [],
  ingredients: [],
  personalizationOptions: {},
  patissiereId: PATISSIERE_ID,
  createdAt: new Date('2024-01-01'),
};

/* ─── Tests ─────────────────────────────────────────────────────────────── */

describe('FindAllProductsUseCase', () => {
  let useCase: FindAllProductsUseCase;

  const mockProductRepo = {
    findMany: jest.fn().mockResolvedValue([mockProductEntity]),
  };

  const mockAuthClient = {
    send: jest.fn().mockReturnValue(of({ data: { users: {} } })),
  };

  const mockNotationClient = {
    send: jest.fn().mockReturnValue(of({ data: { ratings: {}, likes: {}, likerIds: {} } })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllProductsUseCase,
        { provide: PRODUCT_REPOSITORY, useValue: mockProductRepo   },
        { provide: AUTH_CLIENT,        useValue: mockAuthClient    },
        { provide: NOTATION_CLIENT,    useValue: mockNotationClient },
      ],
    }).compile();

    useCase = module.get<FindAllProductsUseCase>(FindAllProductsUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  /* ── success ─────────────────────────────────────────────────────────── */

  it('should return all active products with success: true', async () => {
    const result = await useCase.execute();

    expect(result.success).toBe(true);
    const ok = result as { success: true; data: { products: any[]; count: number } };
    expect(ok.data.products).toHaveLength(1);
    expect(ok.data.count).toBe(1);
    expect(ok.data.products[0].title).toBe('Chocolate Cake');
  });

  it('should query only active products', async () => {
    await useCase.execute();

    expect(mockProductRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    );
  });

  it('should filter by patissiereId when provided in payload', async () => {
    await useCase.execute({ query: { patissiereId: PATISSIERE_ID } });

    expect(mockProductRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true, patissiereId: PATISSIERE_ID }),
    );
  });

  /* ── error handling ──────────────────────────────────────────────────── */

  it('should return a ServiceError when the repository throws', async () => {
    mockProductRepo.findMany.mockRejectedValueOnce(new Error('DB connection lost'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect((result as any).code).toBe(500);
  });
});
