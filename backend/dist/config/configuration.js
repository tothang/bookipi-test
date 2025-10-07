"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    api: {
        prefix: process.env.API_PREFIX || 'api',
        version: process.env.API_VERSION || '1.0',
    },
    database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: process.env.DATABASE_USERNAME || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        name: process.env.DATABASE_NAME || 'flash_sale',
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV !== 'production',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        ttl: parseInt(process.env.REDIS_TTL || String(60 * 60), 10),
    },
    sale: {
        maxAttempts: parseInt(process.env.SALE_MAX_ATTEMPTS || '3', 10),
        lockTtl: parseInt(process.env.SALE_LOCK_TTL || '10000', 10),
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
            max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
        },
    },
});
//# sourceMappingURL=configuration.js.map