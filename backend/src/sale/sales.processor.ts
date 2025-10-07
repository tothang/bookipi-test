import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { SaleService } from './sale.service';

@Processor('sales')
@Injectable()
export class SalesProcessor {
  private readonly logger = new Logger(SalesProcessor.name);

  constructor(private readonly saleService: SaleService) {}

  @Process('incrementSold')
  async handleIncrementSold(job: Job<{ productId: string; increment: number }>) {
    const { productId, increment } = job.data;
    try {
      await this.saleService.updateProductSoldQuantity(productId, increment);
      this.logger.log(`Incremented soldQuantity for product ${productId} by ${increment}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to increment soldQuantity for product ${productId}: ${err?.message}`,
        err?.stack,
      );
      throw err; // allow Bull to retry according to job options
    }
  }
}
