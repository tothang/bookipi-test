import { Product } from './product.entity';
export declare enum OrderStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    FAILED = "failed"
}
export declare class Order {
    id: string;
    userId: string;
    productId: string;
    product: Product;
    quantity: number;
    price: number;
    status: OrderStatus;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date;
    cancelledAt: Date;
}
