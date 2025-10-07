import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { Product } from './entities/product.entity';
import { Order } from './entities/order.entity';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { SalesProcessor } from './sales.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Order]),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        options: {
          host: configService.get('redis.host') || 'localhost',
          port: configService.get('redis.port') || 6379,
          keyPrefix: 'flash-sale:',
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host') || 'localhost',
          port: configService.get('redis.port') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'sales',
    }),
  ],
  controllers: [SaleController],
  providers: [SaleService, SalesProcessor],
  exports: [SaleService],
})
export class SaleModule {}
