import { SaleService } from './sale.service';
import { PurchaseProductDto, PurchaseResponseDto } from './dto/purchase-product.dto';
import { Request } from 'express';
export declare class SaleController {
    private readonly saleService;
    private readonly logger;
    constructor(saleService: SaleService);
    getSaleStatus(productId: string): Promise<{
        success: boolean;
        data: {
            productId: string;
            productName: string;
            status: import("./entities/product.entity").SaleStatus;
            availableQuantity: number;
            totalQuantity: number;
            soldQuantity: number;
            price: number;
            saleStartAt: Date;
            saleEndAt: Date;
        };
    }>;
    getFirstProduct(): Promise<{
        success: boolean;
        data: {
            productId: string;
            productName: string;
            status: import("./entities/product.entity").SaleStatus;
            availableQuantity: number;
            totalQuantity: number;
            soldQuantity: number;
            price: number;
            saleStartAt: Date;
            saleEndAt: Date;
        };
    }>;
    purchaseProduct(purchaseDto: PurchaseProductDto, user: any, req: Request): Promise<{
        success: boolean;
        error: any;
        data?: undefined;
    } | {
        success: boolean;
        data: PurchaseResponseDto;
        error?: undefined;
    }>;
    getUserPurchaseStatus(productId: string, user: any): Promise<{
        success: boolean;
        data: {
            hasPurchased: boolean;
            order: {
                id: string;
                status: import("./entities/order.entity").OrderStatus;
                quantity: number;
                price: number;
                createdAt: Date;
            } | null;
        };
    }>;
}
