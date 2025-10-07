"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const sale_controller_1 = require("./sale.controller");
const sale_service_1 = require("./sale.service");
const product_entity_1 = require("./entities/product.entity");
const order_entity_1 = require("./entities/order.entity");
const ioredis_1 = require("@nestjs-modules/ioredis");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const bull_1 = require("@nestjs/bull");
const sales_processor_1 = require("./sales.processor");
let SaleModule = class SaleModule {
};
exports.SaleModule = SaleModule;
exports.SaleModule = SaleModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([product_entity_1.Product, order_entity_1.Order]),
            ioredis_1.RedisModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    type: 'single',
                    options: {
                        host: configService.get('redis.host') || 'localhost',
                        port: configService.get('redis.port') || 6379,
                        keyPrefix: 'flash-sale:',
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            schedule_1.ScheduleModule.forRoot(),
            bull_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    redis: {
                        host: configService.get('redis.host') || 'localhost',
                        port: configService.get('redis.port') || 6379,
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            bull_1.BullModule.registerQueue({
                name: 'sales',
            }),
        ],
        controllers: [sale_controller_1.SaleController],
        providers: [sale_service_1.SaleService, sales_processor_1.SalesProcessor],
        exports: [sale_service_1.SaleService],
    })
], SaleModule);
//# sourceMappingURL=sale.module.js.map