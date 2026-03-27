import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  console.log('🚀 PAYMENT SERVICE RUNNING');

  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: config.get<number>('TCP_PORT', 3005),
    },
  });

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [config.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
      queue: config.get<string>('RABBITMQ_PAYMENT_QUEUE', 'payment_queue'),
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
}

bootstrap();
