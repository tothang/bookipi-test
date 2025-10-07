"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const sale_service_1 = require("./sale/sale.service");
const product_entity_1 = require("./sale/entities/product.entity");
const typeorm_1 = require("typeorm");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['log', 'error', 'warn'],
    });
    try {
        const saleService = app.get(sale_service_1.SaleService);
        const dataSource = app.get(typeorm_1.DataSource);
        const productRepo = dataSource.getRepository(product_entity_1.Product);
        const now = new Date();
        const ends = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const demo = productRepo.create({
            name: 'Flash Sale Demo Product',
            description: 'Demo item for flash sale testing',
            price: 49.99,
            totalQuantity: 200,
            soldQuantity: 0,
            saleStartAt: now,
            saleEndAt: ends,
            status: product_entity_1.SaleStatus.ACTIVE,
        });
        const product = await productRepo.save(demo);
        await saleService.initializeProduct(product.id);
        const base = process.env.API_PREFIX ? `/` : '/';
        const prefix = process.env.API_PREFIX || 'api';
        const version = process.env.API_VERSION || '1.0';
        const baseUrl = `http://localhost:${process.env.PORT || 3000}/${prefix}/v${version}`;
        console.log('--- Flash Sale Seed Complete ---');
        console.log('Product created:');
        console.log({
            id: product.id,
            name: product.name,
            price: product.price,
            totalQuantity: product.totalQuantity,
            saleStartAt: product.saleStartAt,
            saleEndAt: product.saleEndAt,
            status: product.status,
        });
        console.log('\nTest with curl:');
        console.log(`# Status`);
        console.log(`curl -s ${baseUrl}/sale/status/${product.id} | jq`);
        console.log(`\n# Attempt purchase (replace USER_ID)`);
        console.log(`curl -s -X POST ${baseUrl}/sale/purchase -H 'Content-Type: application/json' -H 'x-user-id: USER_ID' -d '{"productId":"${product.id}","userId":"USER_ID"}' | jq`);
        console.log(`\n# Check user status (replace USER_ID)`);
        console.log(`curl -s '${baseUrl}/sale/user/status?productId=${product.id}' -H 'x-user-id: USER_ID' | jq`);
        console.log('\nFrontend quick test:');
        console.log(`- Start frontend (if not running): cd frontend && npm start`);
        console.log(`- Paste Product ID into the UI: ${product.id}`);
    }
    catch (e) {
        console.error('Seed failed:', e?.message || e);
        process.exitCode = 1;
    }
    finally {
        await app.close();
    }
}
bootstrap();
//# sourceMappingURL=seed.js.map