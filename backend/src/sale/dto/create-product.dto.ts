import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, IsInt, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { SaleStatus } from '../entities/product.entity';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  totalQuantity: number;

  @IsDateString()
  @IsOptional()
  saleStartAt?: string | Date;

  @IsDateString()
  @IsOptional()
  saleEndAt?: string | Date;

  @IsEnum(SaleStatus)
  @IsOptional()
  status?: SaleStatus;
}
