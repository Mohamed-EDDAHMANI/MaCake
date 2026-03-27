import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { PAYMENT_ENDPOINTS } from '../endpoints';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis: Redis;

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    const host = process.env.REDIS_HOST || 'redis';
    const port = Number(process.env.REDIS_PORT) || 6379;

    const options: RedisOptions = {
      host,
      port,
      retryStrategy: (times) => {
        this.logger.warn(`Redis reconnect attempt #${times}`);
        return Math.min(times * 100, 2000);
      },
    };

    try {
      this.redis = new Redis(options);
    } catch (e) {
      this.logger.error(`Failed to create Redis client: ${e.message}`);
    }

    this.redis.on('connect', async () => {
      this.logger.log('Redis connected ✅');
      const serviceHost = process.env.SERVICE_HOST || 'payment-service';
      const servicePort = Number(process.env.TCP_PORT) || 3005;
      
      try {
        await this.registerServiceInfo(
          'payment-service',
          serviceHost,
          servicePort,
          's5' 
        );
      } catch (e) {
        this.logger.error(`Registration failed: ${e.message}`);
      }
    });

     this.redis.on('error', (err) => {
      this.logger.error(`Redis error ❌: ${err.message}`);
    });
  }

  onModuleInit() { }

  async registerServiceInfo(serviceName: string, host: string, port: number, routeKey: string) {
    const instanceId = `${serviceName}:${process.pid}`;
    const serviceInfo = {
      serviceName,
      instances: [
        { id: instanceId, host, port }
      ],
      endpoints: PAYMENT_ENDPOINTS.map(e => ({
        pattern: e.pattern.source,
        roles: e.roles,
      }))
    };
    await this.redis.set(`serviceKey:${routeKey}`, JSON.stringify(serviceInfo));
    this.logger.log(`Registered all service info: serviceKey:${routeKey}`);
  }

  onModuleDestroy() {
    this.redis?.disconnect();
    this.logger.log('Redis disconnected 🔌');
  }

  getClient(): Redis {
    return this.redis;
  }
}
