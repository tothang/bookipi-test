import { SaleStatus } from '../entities/product.entity';
export declare class CreateProductDto {
    name: string;
    description?: string;
    price: number;
    totalQuantity: number;
    saleStartAt?: string | Date;
    saleEndAt?: string | Date;
    status?: SaleStatus;
}
