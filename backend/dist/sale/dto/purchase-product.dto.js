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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseResponseDto = exports.PurchaseProductDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class PurchaseProductDto {
}
exports.PurchaseProductDto = PurchaseProductDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID of the product to purchase', example: '123e4567-e89b-12d3-a456-426614174000' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PurchaseProductDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User ID making the purchase', example: 'user-123' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PurchaseProductDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Additional metadata for the purchase',
        example: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' },
        required: false
    }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], PurchaseProductDto.prototype, "metadata", void 0);
class PurchaseResponseDto {
}
exports.PurchaseResponseDto = PurchaseResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Order ID', example: '123e4567-e89b-12d3-a456-426614174000' }),
    __metadata("design:type", String)
], PurchaseResponseDto.prototype, "orderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174000' }),
    __metadata("design:type", String)
], PurchaseResponseDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User ID', example: 'user-123' }),
    __metadata("design:type", String)
], PurchaseResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Quantity purchased', example: 1 }),
    __metadata("design:type", Number)
], PurchaseResponseDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Price per unit', example: 99.99 }),
    __metadata("design:type", Number)
], PurchaseResponseDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total amount', example: 99.99 }),
    __metadata("design:type", Number)
], PurchaseResponseDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Order status', example: 'completed' }),
    __metadata("design:type", String)
], PurchaseResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Purchase timestamp', type: Date }),
    __metadata("design:type", Date)
], PurchaseResponseDto.prototype, "purchasedAt", void 0);
//# sourceMappingURL=purchase-product.dto.js.map