declare const _default: () => {
    env: string;
    port: number;
    api: {
        prefix: string;
        version: string;
    };
    database: {
        host: string;
        port: number;
        username: string;
        password: string;
        name: string;
        synchronize: boolean;
        logging: boolean;
    };
    redis: {
        host: string;
        port: number;
        ttl: number;
    };
    sale: {
        maxAttempts: number;
        lockTtl: number;
        rateLimit: {
            windowMs: number;
            max: number;
        };
    };
};
export default _default;
