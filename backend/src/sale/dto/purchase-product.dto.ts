import { IsString, IsUUID, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PurchaseProductDto {
  @ApiProperty({ description: 'ID of the product to purchase', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'User ID making the purchase', example: 'user-123' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ 
    description: 'Additional metadata for the purchase',
    example: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' },
    required: false 
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class PurchaseResponseDto {
  @ApiProperty({ description: 'Order ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  orderId: string;

  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  productId: string;

  @ApiProperty({ description: 'User ID', example: 'user-123' })
  userId: string;

  @ApiProperty({ description: 'Quantity purchased', example: 1 })
  quantity: number;

  @ApiProperty({ description: 'Price per unit', example: 99.99 })
  price: number;

  @ApiProperty({ description: 'Total amount', example: 99.99 })
  total: number;

  @ApiProperty({ description: 'Order status', example: 'completed' })
  status: string;

  @ApiProperty({ description: 'Purchase timestamp', type: Date })
  purchasedAt: Date;
}
