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
var SaleController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sale_service_1 = require("./sale.service");
const purchase_product_dto_1 = require("./dto/purchase-product.dto");
const auth_guard_1 = require("../common/guards/auth.guard");
const user_decorator_1 = require("../common/decorators/user.decorator");
let SaleController = SaleController_1 = class SaleController {
    constructor(saleService) {
        this.saleService = saleService;
        this.logger = new common_1.Logger(SaleController_1.name);
    }
    async getSaleStatus(productId) {
        try {
            const { product, availableQuantity, status } = await this.saleService.getProductWithInventory(productId);
            return {
                success: true,
                data: {
                    productId: product.id,
                    productName: product.name,
                    status,
                    availableQuantity,
                    totalQuantity: product.totalQuantity,
                    soldQuantity: product.soldQuantity,
                    price: product.price,
                    saleStartAt: product.saleStartAt,
                    saleEndAt: product.saleEndAt,
                },
            };
        }
        catch (error) {
            this.logger.error(`Failed to get sale status: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getFirstProduct() {
        try {
            const { product, availableQuantity, status } = await this.saleService.getFirstProductWithInventory();
            return {
                success: true,
                data: {
                    productId: product.id,
                    productName: product.name,
                    status,
                    availableQuantity,
                    totalQuantity: product.totalQuantity,
                    soldQuantity: product.soldQuantity,
                    price: product.price,
                    saleStartAt: product.saleStartAt,
                    saleEndAt: product.saleEndAt,
                },
            };
        }
        catch (error) {
            this.logger.error(`Failed to get first product: ${error.message}`, error.stack);
            throw error;
        }
    }
    async purchaseProduct(purchaseDto, user, req) {
        try {
            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'];
            const purchaseWithMetadata = {
                ...purchaseDto,
                userId: user.userId || purchaseDto.userId,
                metadata: {
                    ...purchaseDto.metadata,
                    ip,
                    userAgent,
                    timestamp: new Date().toISOString(),
                },
            };
            const result = await this.saleService.processPurchase(purchaseWithMetadata);
            return { success: true, data: result };
        }
        catch (error) {
            this.logger.error(`Purchase failed: ${error.message}`, error.stack);
            return {
                success: false,
                error: error.message || 'Failed to process purchase',
            };
        }
    }
    async getUserPurchaseStatus(productId, user) {
        try {
            const { hasPurchased, order } = await this.saleService.getUserPurchaseStatus(productId, user.userId);
            return {
                success: true,
                data: {
                    hasPurchased,
                    order: order ? {
                        id: order.id,
                        status: order.status,
                        quantity: order.quantity,
                        price: order.price,
                        createdAt: order.createdAt,
                    } : null,
                },
            };
        }
        catch (error) {
            this.logger.error(`Failed to get user purchase status: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.SaleController = SaleController;
__decorate([
    (0, common_1.Get)('status/:productId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get flash sale status for a product' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the current status of the flash sale' }),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SaleController.prototype, "getSaleStatus", null);
__decorate([
    (0, common_1.Get)('first'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the most recent product with current inventory' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the latest product and its sale status' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SaleController.prototype, "getFirstProduct", null);
__decorate([
    (0, common_1.Post)('purchase'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Attempt to purchase a product in flash sale' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Purchase successful', type: purchase_product_dto_1.PurchaseResponseDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.User)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [purchase_product_dto_1.PurchaseProductDto, Object, Object]),
    __metadata("design:returntype", Promise)
], SaleController.prototype, "purchaseProduct", null);
__decorate([
    (0, common_1.Get)('user/status'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Check if user has purchased the product' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns user purchase status' }),
    __param(0, (0, common_1.Query)('productId')),
    __param(1, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SaleController.prototype, "getUserPurchaseStatus", null);
exports.SaleController = SaleController = SaleController_1 = __decorate([
    (0, swagger_1.ApiTags)('sale'),
    (0, common_1.Controller)('sale'),
    __metadata("design:paramtypes", [sale_service_1.SaleService])
], SaleController);
//# sourceMappingURL=sale.controller.js.map