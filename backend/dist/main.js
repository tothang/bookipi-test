"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const product_entity_1 = require("./sale/entities/product.entity");
const sale_service_1 = require("./sale/sale.service");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('port');
    const apiPrefix = configService.get('api.prefix');
    const apiVersion = configService.get('api.version');
    app.enableCors();
    app.setGlobalPrefix(`${apiPrefix}/v${apiVersion}`);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    const options = new swagger_1.DocumentBuilder()
        .setTitle('Flash Sale API')
        .setDescription('High-performance flash sale platform API')
        .setVersion(apiVersion)
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, options);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    try {
        const dataSource = app.get(typeorm_1.DataSource);
        const saleService = app.get(sale_service_1.SaleService);
        const productRepo = dataSource.getRepository(product_entity_1.Product);
        const existingCount = await productRepo.count();
        console.log(existingCount);
        if (existingCount === 0) {
            const now = new Date();
            const ends = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const demo = productRepo.create({
                name: 'Flash Sale Demo Product',
                description: 'Auto-seeded demo item',
                price: 49.99,
                totalQuantity: 200,
                soldQuantity: 0,
                saleStartAt: now,
                saleEndAt: ends,
                status: product_entity_1.SaleStatus.ACTIVE,
            });
            const product = await productRepo.save(demo);
            await saleService.initializeProduct(product.id);
            console.log('[Seed] Demo product created on startup:', product.id);
        }
    }
    catch (e) {
        console.warn('[Seed] Skipped seeding on startup:', e?.message || e);
    }
    try {
        const dataSource = app.get(typeorm_1.DataSource);
        const saleService = app.get(sale_service_1.SaleService);
        const productRepo = dataSource.getRepository(product_entity_1.Product);
        const all = await productRepo.find();
        const candidates = all.filter((p) => p.status === product_entity_1.SaleStatus.ACTIVE || p.status === product_entity_1.SaleStatus.UPCOMING);
        await Promise.all(candidates.map((p) => saleService.initializeProduct(p.id)));
        console.log(`[Warmup] Initialized Redis inventory for ${candidates.length} products`);
    }
    catch (e) {
        console.warn('[Warmup] Skipped inventory warm-up:', e?.message || e);
    }
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap().catch((err) => {
    console.error('Error during bootstrap:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map