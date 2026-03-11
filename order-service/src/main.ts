import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  console.log('🚀 ORDERS SERVICE RUNNING');

  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: config.get<number>('TCP_PORT', 3003),
    },
  });

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [config.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
      queue: config.get<string>('RABBITMQ_ORDERS_QUEUE', 'orders_queue'),
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
}

bootstrap();
