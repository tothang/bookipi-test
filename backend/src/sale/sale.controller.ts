import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseGuards, 
  Req, 
  Query, 
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SaleService } from './sale.service';
import { PurchaseProductDto, PurchaseResponseDto } from './dto/purchase-product.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { Request } from 'express';
import { User } from '../common/decorators/user.decorator';

@ApiTags('sale')
@Controller('sale')
export class SaleController {
  private readonly logger = new Logger(SaleController.name);

  constructor(private readonly saleService: SaleService) {}

  @Get('status/:productId')
  @ApiOperation({ summary: 'Get flash sale status for a product' })
  @ApiResponse({ status: 200, description: 'Returns the current status of the flash sale' })
  async getSaleStatus(@Param('productId') productId: string) {
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
    } catch (error) {
      this.logger.error(`Failed to get sale status: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('first')
  @ApiOperation({ summary: 'Get the most recent product with current inventory' })
  @ApiResponse({ status: 200, description: 'Returns the latest product and its sale status' })
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
    } catch (error) {
      this.logger.error(`Failed to get first product: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('purchase')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attempt to purchase a product in flash sale' })
  @ApiResponse({ status: 201, description: 'Purchase successful', type: PurchaseResponseDto })
  async purchaseProduct(
    @Body() purchaseDto: PurchaseProductDto,
    @User() user: any,
    @Req() req: Request,
  ) {
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
    } catch (error) {
      // Log and return a graceful failure instead of throwing
      this.logger.error(`Purchase failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message || 'Failed to process purchase',
      };
    }
  }

  @Get('user/status')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user has purchased the product' })
  @ApiResponse({ status: 200, description: 'Returns user purchase status' })
  async getUserPurchaseStatus(
    @Query('productId') productId: string,
    @User() user: any,
  ) {
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
    } catch (error) {
      this.logger.error(`Failed to get user purchase status: ${error.message}`, error.stack);
      throw error;
    }
  }
}
