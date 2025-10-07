import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Product, SaleStatus } from './sale/entities/product.entity';
import { SaleService } from './sale/sale.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get('port');
  const apiPrefix = configService.get('api.prefix');
  const apiVersion = configService.get('api.version');

  // Enable CORS
  app.enableCors();

  // Global prefix
  app.setGlobalPrefix(`${apiPrefix}/v${apiVersion}`);

  // Enable validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const options = new DocumentBuilder()
    .setTitle('Flash Sale API')
    .setDescription('High-performance flash sale platform API')
    .setVersion(apiVersion)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/docs', app, document);

  // Conditional seed: if no products exist, create one and init Redis inventory
  try {
    const dataSource = app.get(DataSource);
    const saleService = app.get(SaleService);
    const productRepo = dataSource.getRepository(Product);
    const existingCount = await productRepo.count();
    console.log(existingCount);

    if (existingCount === 0) {
      const now = new Date();
      const ends = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2h

      const demo = productRepo.create({
        name: 'Flash Sale Demo Product',
        description: 'Auto-seeded demo item',
        price: 49.99,
        totalQuantity: 200,
        soldQuantity: 0,
        saleStartAt: now,
        saleEndAt: ends,
        status: SaleStatus.ACTIVE,
      });

      const product = await productRepo.save(demo);
      await saleService.initializeProduct(product.id);

      // eslint-disable-next-line no-console
      console.log('[Seed] Demo product created on startup:', product.id);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[Seed] Skipped seeding on startup:', (e as any)?.message || e);
  }

  // Warm-up job: ensure Redis inventory is initialized for ACTIVE/UPCOMING products
  try {
    const dataSource = app.get(DataSource);
    const saleService = app.get(SaleService);
    const productRepo = dataSource.getRepository(Product);

    const all = await productRepo.find();
    const candidates = all.filter(
      (p) => p.status === SaleStatus.ACTIVE || p.status === SaleStatus.UPCOMING,
    );
    await Promise.all(candidates.map((p) => saleService.initializeProduct(p.id)));
    // eslint-disable-next-line no-console
    console.log(`[Warmup] Initialized Redis inventory for ${candidates.length} products`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[Warmup] Skipped inventory warm-up:', (e as any)?.message || e);
  }

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
