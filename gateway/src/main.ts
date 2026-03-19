import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { json, urlencoded } from 'express';

const cookieParser = require('cookie-parser');

async function bootstrap() {
  
  const app = await NestFactory.create(AppModule);

  // Increase body size limit to 10MB to support base64-encoded profile photos
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  app.use(cookieParser());

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Gateway listening on http://0.0.0.0:${port}`);
}
bootstrap();
