import { Repository, DataSource } from 'typeorm';
import { Product } from './entities/product.entity';
import { Order } from './entities/order.entity';
import { PurchaseProductDto, PurchaseResponseDto } from './dto/purchase-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { Redis } from 'ioredis';
import { SaleStatus } from './entities/product.entity';
import { Queue } from 'bull';
export declare class SaleService {
    private readonly productRepository;
    private readonly orderRepository;
    private readonly dataSource;
    private readonly redisClient;
    private readonly salesQueue;
    private readonly logger;
    private readonly PURCHASE_LOCK_PREFIX;
    private readonly PRODUCT_INVENTORY_PREFIX;
    private readonly USER_PURCHASE_PREFIX;
    constructor(productRepository: Repository<Product>, orderRepository: Repository<Order>, dataSource: DataSource, redisClient: Redis, salesQueue: Queue);
    initializeProduct(productId: string): Promise<void>;
    getProductWithInventory(productId: string): Promise<{
        product: Product;
        availableQuantity: number;
        status: SaleStatus;
    }>;
    processPurchase(purchaseDto: PurchaseProductDto): Promise<PurchaseResponseDto>;
    createProduct(createProductDto: CreateProductDto): Promise<Product>;
    getUserPurchaseStatus(productId: string, userId: string): Promise<{
        hasPurchased: boolean;
        order?: Order;
    }>;
    updateSaleStatus(): Promise<void>;
    private getInventoryKey;
    private getPurchaseLockKey;
    private getUserPurchaseKey;
    private acquireLock;
    private releaseLock;
    private getAvailableQuantity;
    private decrementInventory;
    private incrementInventory;
    updateProductSoldQuantity(productId: string, increment: number): Promise<void>;
    persistOrderTransactional(payload: {
        orderId: string;
        productId: string;
        userId: string;
        quantity: number;
        price: number;
        metadata: Record<string, any>;
        completedAt: string;
    }): Promise<void>;
    getFirstProductWithInventory(): Promise<{
        product: Product;
        availableQuantity: number;
        status: SaleStatus;
    }>;
}
