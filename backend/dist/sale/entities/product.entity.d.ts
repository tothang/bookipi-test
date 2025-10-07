import { Order } from './order.entity';
export declare enum SaleStatus {
    UPCOMING = "upcoming",
    ACTIVE = "active",
    ENDED = "ended"
}
export declare class Product {
    id: string;
    name: string;
    description: string;
    price: number;
    totalQuantity: number;
    soldQuantity: number;
    saleStartAt: Date;
    saleEndAt: Date;
    status: SaleStatus;
    orders: Order[];
    createdAt: Date;
    updatedAt: Date;
    getRemainingQuantity(): number;
    isSaleActive(): boolean;
}
