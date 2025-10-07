import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SaleService } from './sale.service';
import { Product, SaleStatus } from './entities/product.entity';
import { Order, OrderStatus } from './entities/order.entity';

describe('SaleService', () => {
  let service: SaleService;
  let productRepository: Repository<Product>;
  let orderRepository: Repository<Order>;
  let redisClient: any;
  let dataSource: DataSource;

  const mockProduct: Product = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Limited Edition Product',
    description: 'A limited edition flash sale product',
    price: 99.99,
    totalQuantity: 100,
    soldQuantity: 0,
    saleStartAt: new Date(Date.now() - 1000),
    saleEndAt: new Date(Date.now() + 3600000),
    status: SaleStatus.ACTIVE,
    orders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    getRemainingQuantity: () => 100,
    isSaleActive: () => true,
  };

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    decrby: jest.fn(),
    incrby: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaleService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            increment: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<SaleService>(SaleService);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    redisClient = mockRedisClient;
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeProduct', () => {
    it('should initialize product inventory in Redis', async () => {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct);
      mockRedisClient.exists.mockResolvedValue(0);
      mockRedisClient.set.mockResolvedValue('OK');

      await service.initializeProduct(mockProduct.id);

      expect(productRepository.findOne).toHaveBeenCalledWith({ where: { id: mockProduct.id } });
      expect(mockRedisClient.exists).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.stringContaining(mockProduct.id),
        100,
      );
    });

    it('should throw NotFoundException if product does not exist', async () => {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      await expect(service.initializeProduct('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProductWithInventory', () => {
    it('should return product with inventory', async () => {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct);
      mockRedisClient.get.mockResolvedValue('50');

      const result = await service.getProductWithInventory(mockProduct.id);

      expect(result).toEqual({
        product: mockProduct,
        availableQuantity: 50,
        status: SaleStatus.ACTIVE,
      });
    });

    it('should throw NotFoundException if product does not exist', async () => {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getProductWithInventory('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('processPurchase', () => {
    const purchaseDto = {
      productId: mockProduct.id,
      userId: 'user-123',
      metadata: {},
    };

    it('should successfully process a purchase', async () => {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(orderRepository, 'create').mockReturnValue({
        id: 'order-123',
        productId: mockProduct.id,
        userId: 'user-123',
        quantity: 1,
        price: mockProduct.price,
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
      } as Order);

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('50');
      mockRedisClient.decrby.mockResolvedValue(49);
      mockQueryRunner.manager.save.mockResolvedValue({});

      const result = await service.processPurchase(purchaseDto);

      expect(result).toMatchObject({
        productId: mockProduct.id,
        userId: 'user-123',
        quantity: 1,
        price: mockProduct.price,
      });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if product is out of stock', async () => {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct);
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('0');

      await expect(service.processPurchase(purchaseDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user already purchased', async () => {
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue({
        id: 'existing-order',
        userId: 'user-123',
        productId: mockProduct.id,
        status: OrderStatus.COMPLETED,
      } as Order);

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('50');

      await expect(service.processPurchase(purchaseDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if sale is not active', async () => {
      const inactiveProduct = {
        ...mockProduct,
        status: SaleStatus.ENDED,
        isSaleActive: () => false,
      };

      jest.spyOn(productRepository, 'findOne').mockResolvedValue(inactiveProduct);
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('50');

      await expect(service.processPurchase(purchaseDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('getUserPurchaseStatus', () => {
    it('should return purchase status when user has purchased', async () => {
      const mockOrder = {
        id: 'order-123',
        userId: 'user-123',
        productId: mockProduct.id,
        status: OrderStatus.COMPLETED,
      } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);

      const result = await service.getUserPurchaseStatus(mockProduct.id, 'user-123');

      expect(result).toEqual({
        hasPurchased: true,
        order: mockOrder,
      });
    });

    it('should return purchase status when user has not purchased', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getUserPurchaseStatus(mockProduct.id, 'user-123');

      expect(result).toEqual({
        hasPurchased: false,
        order: undefined,
      });
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const createProductDto = {
        name: 'New Product',
        description: 'A new flash sale product',
        price: 149.99,
        totalQuantity: 50,
        saleStartAt: new Date(),
        saleEndAt: new Date(Date.now() + 3600000),
      };

      jest.spyOn(productRepository, 'create').mockReturnValue(mockProduct);
      jest.spyOn(productRepository, 'save').mockResolvedValue(mockProduct);

      const result = await service.createProduct(createProductDto);

      expect(result).toEqual(mockProduct);
      expect(productRepository.create).toHaveBeenCalledWith({
        ...createProductDto,
        soldQuantity: 0,
        status: SaleStatus.UPCOMING,
      });
    });
  });
});
