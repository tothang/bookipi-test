"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SaleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_entity_1 = require("./entities/product.entity");
const order_entity_1 = require("./entities/order.entity");
const schedule_1 = require("@nestjs/schedule");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
const uuid_1 = require("uuid");
const product_entity_2 = require("./entities/product.entity");
const bull_1 = require("@nestjs/bull");
let SaleService = SaleService_1 = class SaleService {
    constructor(productRepository, orderRepository, dataSource, redisClient, salesQueue) {
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.dataSource = dataSource;
        this.redisClient = redisClient;
        this.salesQueue = salesQueue;
        this.logger = new common_1.Logger(SaleService_1.name);
        this.PURCHASE_LOCK_PREFIX = 'purchase_lock:';
        this.PRODUCT_INVENTORY_PREFIX = 'product_inventory:';
        this.USER_PURCHASE_PREFIX = 'user_purchase:';
    }
    async initializeProduct(productId) {
        const product = await this.productRepository.findOne({ where: { id: productId } });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        const redisClient = this.redisClient;
        const inventoryKey = this.getInventoryKey(productId);
        const exists = await redisClient.exists(inventoryKey);
        if (!exists) {
            await redisClient.set(inventoryKey, product.getRemainingQuantity());
        }
    }
    async getProductWithInventory(productId) {
        const [product, inventory] = await Promise.all([
            this.productRepository.findOne({ where: { id: productId } }),
            this.getAvailableQuantity(productId),
        ]);
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return {
            product,
            availableQuantity: inventory,
            status: product.status,
        };
    }
    async processPurchase(purchaseDto) {
        const { productId, userId, metadata = {} } = purchaseDto;
        const lockKey = this.getPurchaseLockKey(productId, userId);
        const lockValue = (0, uuid_1.v4)();
        const lockAcquired = await this.acquireLock(lockKey, lockValue);
        if (!lockAcquired) {
            throw new Error('Unable to acquire lock for purchase');
        }
        try {
            const { product, availableQuantity } = await this.getProductWithInventory(productId);
            if (availableQuantity <= 0) {
                this.logger.warn(`Out of stock for product ${productId}`);
                return { error: 'Product is out of stock' };
            }
            if (!product.isSaleActive()) {
                this.logger.warn(`Sale not active for product ${productId}`);
                return { error: 'Sale is not active' };
            }
            const userPurchaseKey = this.getUserPurchaseKey(productId, userId);
            const existingMarker = await this.redisClient.get(userPurchaseKey);
            if (existingMarker) {
                this.logger.warn(`Duplicate purchase attempt (marker) for user ${userId} product ${productId}`);
                return { error: 'You have already purchased this item' };
            }
            const existingOrder = await this.orderRepository.findOne({
                where: { productId, userId, status: order_entity_1.OrderStatus.COMPLETED },
            });
            if (existingOrder) {
                this.logger.warn(`Duplicate purchase attempt (db) for user ${userId} product ${productId}`);
                return { error: 'You have already purchased this item' };
            }
            const newQuantity = await this.decrementInventory(productId, 1);
            if (newQuantity < 0) {
                await this.incrementInventory(productId, 1);
                throw new common_1.BadRequestException('Insufficient inventory');
            }
            const orderId = (0, uuid_1.v4)();
            const setMarker = await this.redisClient.set(userPurchaseKey, orderId, 'NX');
            if (setMarker !== 'OK') {
                await this.incrementInventory(productId, 1);
                throw new common_1.BadRequestException('You have already purchased this item');
            }
            await this.salesQueue.add('persistOrder', {
                orderId,
                productId,
                userId,
                quantity: 1,
                price: product.price,
                metadata,
                completedAt: new Date().toISOString(),
            }, { jobId: orderId, attempts: 5, backoff: { type: 'exponential', delay: 2000 } });
            return {
                orderId,
                productId,
                userId,
                quantity: 1,
                price: product.price,
                total: product.price * 1,
                status: order_entity_1.OrderStatus.COMPLETED,
                purchasedAt: new Date(),
            };
        }
        finally {
            await this.releaseLock(lockKey, lockValue);
        }
    }
    async createProduct(createProductDto) {
        const product = this.productRepository.create({
            ...createProductDto,
            soldQuantity: 0,
            status: createProductDto.status || product_entity_2.SaleStatus.UPCOMING,
        });
        return this.productRepository.save(product);
    }
    async getUserPurchaseStatus(productId, userId) {
        const markerKey = this.getUserPurchaseKey(productId, userId);
        const markerOrderId = await this.redisClient.get(markerKey);
        if (markerOrderId) {
            const byId = await this.orderRepository.findOne({ where: { id: markerOrderId } });
            if (byId) {
                return { hasPurchased: true, order: byId };
            }
            return { hasPurchased: true };
        }
        const order = await this.orderRepository.findOne({
            where: { productId, userId, status: order_entity_1.OrderStatus.COMPLETED },
        });
        return { hasPurchased: !!order, order: order || undefined };
    }
    async updateSaleStatus() {
        const now = new Date();
        const products = await this.productRepository.find({
            where: {
                status: (0, typeorm_2.In)([product_entity_2.SaleStatus.UPCOMING, product_entity_2.SaleStatus.ACTIVE]),
            },
        });
        for (const product of products) {
            if (product.status === product_entity_2.SaleStatus.UPCOMING &&
                product.saleStartAt &&
                product.saleStartAt <= now) {
                product.status = product_entity_2.SaleStatus.ACTIVE;
                await this.productRepository.save(product);
                this.logger.log(`Sale started for product ${product.id}`);
            }
            if (product.status === product_entity_2.SaleStatus.ACTIVE &&
                product.saleEndAt &&
                product.saleEndAt <= now) {
                product.status = product_entity_2.SaleStatus.ENDED;
                await this.productRepository.save(product);
                this.logger.log(`Sale ended for product ${product.id}`);
            }
        }
    }
    getInventoryKey(productId) {
        return `${this.PRODUCT_INVENTORY_PREFIX}${productId}`;
    }
    getPurchaseLockKey(productId, userId) {
        return `${this.PURCHASE_LOCK_PREFIX}${productId}:${userId}`;
    }
    getUserPurchaseKey(productId, userId) {
        return `${this.USER_PURCHASE_PREFIX}${productId}:${userId}`;
    }
    async acquireLock(key, value, ttl = 10000) {
        const result = await this.redisClient.set(key, value, 'PX', ttl, 'NX');
        return result === 'OK';
    }
    async releaseLock(key, value) {
        const currentValue = await this.redisClient.get(key);
        if (currentValue === value) {
            await this.redisClient.del(key);
        }
    }
    async getAvailableQuantity(productId) {
        const key = this.getInventoryKey(productId);
        const cached = await this.redisClient.get(key);
        if (cached !== null) {
            return parseInt(cached, 10);
        }
        await this.initializeProduct(productId);
        const seeded = await this.redisClient.get(key);
        return seeded ? parseInt(seeded, 10) : 0;
    }
    async decrementInventory(productId, quantity) {
        const key = this.getInventoryKey(productId);
        return this.redisClient.decrby(key, quantity);
    }
    async incrementInventory(productId, quantity) {
        const key = this.getInventoryKey(productId);
        return this.redisClient.incrby(key, quantity);
    }
    async updateProductSoldQuantity(productId, increment) {
        await this.productRepository.increment({ id: productId }, 'soldQuantity', increment);
    }
    async persistOrderTransactional(payload) {
        const { orderId, productId, userId, quantity, price, metadata, completedAt } = payload;
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const dup = await this.orderRepository.findOne({ where: { productId, userId, status: order_entity_1.OrderStatus.COMPLETED } });
            if (dup) {
                await queryRunner.commitTransaction();
                return;
            }
            const order = this.orderRepository.create({
                id: orderId,
                productId,
                userId,
                quantity,
                price,
                metadata,
                status: order_entity_1.OrderStatus.COMPLETED,
                completedAt: new Date(completedAt),
            });
            await queryRunner.manager.save(order);
            await queryRunner.commitTransaction();
            await this.salesQueue.add('incrementSold', { productId, increment: quantity }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } });
        }
        catch (e) {
            await queryRunner.rollbackTransaction();
            throw e;
        }
        finally {
            await queryRunner.release();
        }
    }
    async getFirstProductWithInventory() {
        const [product] = await this.productRepository.find({
            order: { createdAt: 'DESC' },
            take: 1,
        });
        if (!product) {
            throw new common_1.NotFoundException('No products found');
        }
        const availableQuantity = await this.getAvailableQuantity(product.id);
        return { product, availableQuantity, status: product.status };
    }
};
exports.SaleService = SaleService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SaleService.prototype, "updateSaleStatus", null);
exports.SaleService = SaleService = SaleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(3, (0, ioredis_1.InjectRedis)()),
    __param(4, (0, bull_1.InjectQueue)('sales')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        ioredis_2.Redis, Object])
], SaleService);
//# sourceMappingURL=sale.service.js.map