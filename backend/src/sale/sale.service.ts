import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, QueryRunner } from 'typeorm';
import { Product } from './entities/product.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { PurchaseProductDto, PurchaseResponseDto } from './dto/purchase-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { SaleStatus } from './entities/product.entity';

@Injectable()
export class SaleService {
  private readonly logger = new Logger(SaleService.name);
  private readonly PURCHASE_LOCK_PREFIX = 'purchase_lock:';
  private readonly PRODUCT_INVENTORY_PREFIX = 'product_inventory:';
  private readonly USER_PURCHASE_PREFIX = 'user_purchase:';
  private readonly SALE_STATUS_KEY = 'sale_status';

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    @InjectRedis()
    private readonly redisClient: Redis,
  ) {}

  // Initialize product and inventory in Redis
  async initializeProduct(productId: string): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const redisClient = this.redisClient;
    const inventoryKey = this.getInventoryKey(productId);
    
    // Set initial inventory if not exists
    const exists = await redisClient.exists(inventoryKey);
    if (!exists) {
      await redisClient.set(inventoryKey, product.getRemainingQuantity());
    }
  }

  // Get product with inventory
  async getProductWithInventory(productId: string): Promise<{
    product: Product;
    availableQuantity: number;
    status: SaleStatus;
  }> {
    const [product, inventory] = await Promise.all([
      this.productRepository.findOne({ where: { id: productId } }),
      this.getAvailableQuantity(productId),
    ]);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      product,
      availableQuantity: inventory,
      status: product.status,
    };
  }

  // Process purchase with distributed locking
  async processPurchase(
    purchaseDto: PurchaseProductDto,
  ): Promise<PurchaseResponseDto> {
    const { productId, userId, metadata = {} } = purchaseDto;
    const lockKey = this.getPurchaseLockKey(productId, userId);
    const lockValue = uuidv4();
    
    // Use Redis lock to prevent concurrent purchases
    const lockAcquired = await this.acquireLock(lockKey, lockValue);
    if (!lockAcquired) {
      throw new Error('Unable to acquire lock for purchase');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Check product availability
      const { product, availableQuantity } = await this.getProductWithInventory(productId);
      
      if (availableQuantity <= 0) {
        throw new BadRequestException('Product is out of stock');
      }

      if (!product.isSaleActive()) {
        throw new BadRequestException('Sale is not active');
      }

      // Check if user already purchased
      const existingOrder = await this.orderRepository.findOne({
        where: {
          productId,
          userId,
          status: OrderStatus.COMPLETED,
        },
      });

      if (existingOrder) {
        throw new BadRequestException('You have already purchased this item');
      }

      // Decrement inventory
      const newQuantity = await this.decrementInventory(productId, 1);
      if (newQuantity < 0) {
        // Rollback inventory if we went negative (shouldn't happen due to lock)
        await this.incrementInventory(productId, 1);
        throw new BadRequestException('Insufficient inventory');
      }

      // Create order
      const order = this.orderRepository.create({
        productId,
        userId,
        quantity: 1,
        price: product.price,
        status: OrderStatus.COMPLETED,
        metadata,
        completedAt: new Date(),
      });

      await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();

      // Update product sold quantity asynchronously
      this.updateProductSoldQuantity(productId, 1).catch((err) =>
        this.logger.error(`Failed to update sold quantity: ${err.message}`, err.stack),
      );

      return {
        orderId: order.id,
        productId: order.productId,
        userId: order.userId,
        quantity: order.quantity,
        price: order.price,
        total: order.price * order.quantity,
        status: order.status,
        purchasedAt: order.completedAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Purchase failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
      await this.releaseLock(lockKey, lockValue);
    }
  }

  // Create a new product
  async createProduct(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create({
      ...createProductDto,
      soldQuantity: 0,
      status: createProductDto.status || SaleStatus.UPCOMING,
    });

    return this.productRepository.save(product);
  }

  // Get user's purchase status
  async getUserPurchaseStatus(
    productId: string,
    userId: string,
  ): Promise<{ hasPurchased: boolean; order?: Order }> {
    const order = await this.orderRepository.findOne({
      where: {
        productId,
        userId,
        status: OrderStatus.COMPLETED,
      },
    });

    return {
      hasPurchased: !!order,
      order: order || undefined,
    };
  }

  // Update sale status based on current time
  @Cron(CronExpression.EVERY_MINUTE)
  async updateSaleStatus(): Promise<void> {
    const now = new Date();
    const products = await this.productRepository.find({
      where: {
        status: In([SaleStatus.UPCOMING, SaleStatus.ACTIVE]),
      },
    });

    for (const product of products) {
      if (
        product.status === SaleStatus.UPCOMING &&
        product.saleStartAt &&
        product.saleStartAt <= now
      ) {
        product.status = SaleStatus.ACTIVE;
        await this.productRepository.save(product);
        this.logger.log(`Sale started for product ${product.id}`);
      }

      if (
        product.status === SaleStatus.ACTIVE &&
        product.saleEndAt &&
        product.saleEndAt <= now
      ) {
        product.status = SaleStatus.ENDED;
        await this.productRepository.save(product);
        this.logger.log(`Sale ended for product ${product.id}`);
      }
    }
  }

  // Helper methods for Redis operations
  private getInventoryKey(productId: string): string {
    return `${this.PRODUCT_INVENTORY_PREFIX}${productId}`;
  }

  private getPurchaseLockKey(productId: string, userId: string): string {
    return `${this.PURCHASE_LOCK_PREFIX}${productId}:${userId}`;
  }

  private getUserPurchaseKey(productId: string, userId: string): string {
    return `${this.USER_PURCHASE_PREFIX}${productId}:${userId}`;
  }

  private async acquireLock(key: string, value: string, ttl = 10000): Promise<boolean> {
    const result = await this.redisClient.set(key, value, 'PX', ttl, 'NX');
    return result === 'OK';
  }

  private async releaseLock(key: string, value: string): Promise<void> {
    const currentValue = await this.redisClient.get(key);
    
    // Only delete the key if the value matches (prevents releasing someone else's lock)
    if (currentValue === value) {
      await this.redisClient.del(key);
    }
  }

  private async getAvailableQuantity(productId: string): Promise<number> {
    const result = await this.redisClient.get(this.getInventoryKey(productId));
    return result ? parseInt(result, 10) : 0;
  }

  private async decrementInventory(productId: string, quantity: number): Promise<number> {
    const key = this.getInventoryKey(productId);
    return this.redisClient.decrby(key, quantity);
  }

  private async incrementInventory(productId: string, quantity: number): Promise<number> {
    const key = this.getInventoryKey(productId);
    return this.redisClient.incrby(key, quantity);
  }

  private async updateProductSoldQuantity(
    productId: string,
    increment: number,
  ): Promise<void> {
    await this.productRepository.increment(
      { id: productId },
      'soldQuantity',
      increment,
    );
  }

  // Get the most recently created product with its current inventory
  async getFirstProductWithInventory(): Promise<{
    product: Product;
    availableQuantity: number;
    status: SaleStatus;
  }> {
    const [product] = await this.productRepository.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });
    if (!product) {
      throw new NotFoundException('No products found');
    }
    const availableQuantity = await this.getAvailableQuantity(product.id);
    return { product, availableQuantity, status: product.status };
  }
}
