import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { of } from 'rxjs';
import { ProductService } from './product.service';
import { Product } from './schemas/product.schema';
import { CategoryService } from '../category/category.service';
import { S3Service } from '../../s3/s3.service';
import { AUTH_CLIENT, NOTATION_CLIENT } from '../../messaging';

/* ─── Shared mock data ─────────────────────────────────────────────────── */

const CATEGORY_ID = '507f1f77bcf86cd799439011';
const PATISSIERE_ID = '507f1f77bcf86cd799439022';
const PRODUCT_ID = '507f1f77bcf86cd799439033';

const mockCategoryDoc = { _id: CATEGORY_ID, name: 'Birthday' };

/** Minimal Mongoose document that satisfies toProductDto() */
function makeMockProductDoc(overrides: Partial<any> = {}) {
  const base = {
    _id: { toString: () => PRODUCT_ID },
    title: 'Chocolate Cake',
    description: 'Rich chocolate cake',
    price: 120,
    images: [],
    ingredients: [],
    personalizationOptions: {},
    patissiereId: { toString: () => PATISSIERE_ID },
    rating: 0,
    likesCount: 0,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    categoryId: { _id: { toString: () => CATEGORY_ID }, name: 'Birthday' },
    ...overrides,
  };

  return {
    ...base,
    toObject: () => base,
  };
}

/* ─── Tests ────────────────────────────────────────────────────────────── */

describe('ProductService', () => {
  let service: ProductService;
  let productModel: any;

  const mockCategoryService = {
    findById: jest.fn().mockResolvedValue(mockCategoryDoc),
    findByName: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      success: true,
      data: { category: { id: CATEGORY_ID } },
    }),
  };

  const mockS3Service = {
    uploadProductImage: jest.fn().mockResolvedValue('/files/catalog/products/img.jpg'),
  };

  const mockAuthClient = {
    send: jest.fn().mockReturnValue(of({ data: { users: {} } })),
  };

  const mockNotationClient = {
    send: jest.fn().mockReturnValue(of({ data: { ratings: {} } })),
  };

  beforeEach(async () => {
    const mockProductDoc = makeMockProductDoc();

    productModel = {
      find: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockProductDoc]),
        }),
      }),
      findById: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProductDoc),
        }),
        exec: jest.fn().mockResolvedValue(mockProductDoc),
      }),
      create: jest.fn().mockResolvedValue({ _id: PRODUCT_ID }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProductDoc),
        }),
        exec: jest.fn().mockResolvedValue(mockProductDoc),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: getModelToken(Product.name), useValue: productModel },
        { provide: CategoryService, useValue: mockCategoryService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: AUTH_CLIENT, useValue: mockAuthClient },
        { provide: NOTATION_CLIENT, useValue: mockNotationClient },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => jest.clearAllMocks());

  /* ── findAll ────────────────────────────────────────────────────────── */

  describe('findAll()', () => {
    it('should return all active products with success true', async () => {
      const result = await service.findAll();

      expect(result.success).toBe(true);
      const ok = result as { success: true; data: { products: any[]; count: number } };
      expect(ok.data.products).toHaveLength(1);
      expect(ok.data.count).toBe(1);
      expect(ok.data.products[0].title).toBe('Chocolate Cake');
    });

    it('should query only active products', async () => {
      await service.findAll();

      expect(productModel.find).toHaveBeenCalledWith({ isActive: true });
    });

    it('should return a ServiceError when the DB throws', async () => {
      productModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('DB connection lost')),
        }),
      });

      const result = await service.findAll();

      expect(result.success).toBe(false);
    });
  });

  /* ── create ─────────────────────────────────────────────────────────── */

  describe('create()', () => {
    const createDto = {
      title: 'Chocolate Cake',
      description: 'Rich chocolate cake',
      price: 120,
      patissiereId: PATISSIERE_ID,
      categoryId: CATEGORY_ID,
    };

    it('should create a product and return success true', async () => {
      const result = await service.create(createDto as any);

      expect(result.success).toBe(true);
      const ok = result as { success: true; data: { product: any } };
      expect(ok.data.product).toBeDefined();
      expect(ok.data.product.title).toBe('Chocolate Cake');
    });

    it('should persist the product via the model', async () => {
      await service.create(createDto as any);

      expect(productModel.create).toHaveBeenCalledTimes(1);
      const callArg = productModel.create.mock.calls[0][0];
      expect(callArg.title).toBe('Chocolate Cake');
      expect(callArg.price).toBe(120);
    });

    it('should return a ServiceError when the category does not exist', async () => {
      mockCategoryService.findById.mockResolvedValueOnce(null);

      const result = await service.create(createDto as any);

      expect(result.success).toBe(false);
      expect((result as any).code).toBe(404);
    });

    it('should return a ServiceError when neither categoryId nor categoryName is provided', async () => {
      const { categoryId: _, ...dtoWithoutCategory } = createDto;
      const result = await service.create(dtoWithoutCategory as any);

      expect(result.success).toBe(false);
      expect((result as any).code).toBe(400);
    });
  });
});
