export declare class PurchaseProductDto {
    productId: string;
    userId: string;
    metadata?: Record<string, any>;
}
export declare class PurchaseResponseDto {
    orderId: string;
    productId: string;
    userId: string;
    quantity: number;
    price: number;
    total: number;
    status: string;
    purchasedAt: Date;
}
