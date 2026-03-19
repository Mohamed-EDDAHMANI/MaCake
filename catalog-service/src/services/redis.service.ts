
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { CATALOG_ENDPOINTS } from '../endpoints';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis: Redis;


  // const ser = {
  //   "serviceKey:s2": {
  //     "serviceName": "catalog-service",
  //     "instances": [
  //       {
  //         "id": "catalog-service:12345",
  //         "host": "catalog-service",
  //         "port": 3002
  //       }
  //     ],
  //     "endpoints": {
  //       "/product/create": ["admin"],
  //       "/product/update/:id": ["admin"],
  //       "/product/delete/:id": ["admin"]
  //     }
  //   }
  // }

  async registerServiceInfo(serviceName: string, host: string, port: number, routeKey: string) {
    const instanceId = `${serviceName}:${process.pid}`;
    const serviceInfo = {
      serviceName,
      instances: [
        { id: instanceId, host, port }
      ],
      endpoints: CATALOG_ENDPOINTS.map(e => ({
        pattern: e.pattern.source,
        roles: e.roles,
      }))
    };
    await this.redis.set(`serviceKey:${routeKey}`, JSON.stringify(serviceInfo));
    this.logger.log(`Registered all service info: serviceKey:${routeKey}`);
  }

  onModuleInit() {
    this.logger.log('Redis connecting...');
    const options: RedisOptions = {
      host: process.env.REDIS_HOST || 'redis', // docker service name
      port: Number(process.env.REDIS_PORT) || 6379,
      retryStrategy: (times) => {
        this.logger.warn(`Redis reconnect attempt #${times}`);
        return Math.min(times * 100, 2000);
      },
    };

    this.redis = new Redis(options);

    this.redis.on('connect', async () => {
      this.logger.log('Redis connected ✅');
      await this.registerServiceInfo(
        'catalog-service', //container name
        process.env.HOST || 'catalog-service',
        Number(process.env.PORT) || 3002,
        's2'
      );
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis error ❌', err);
    });
  }

  onModuleDestroy() {
    this.redis?.disconnect();
    this.logger.log('Redis disconnected 🔌');
  }

  getClient(): Redis {
    return this.redis;
  }
}
