import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app/app.module';
import { MyLogger } from '@mytest/common';

async function bootstrap() {
  const logger = new MyLogger('InvoiceService');

  const app = await NestFactory.create(AppModule, {
    logger: logger,
  });

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const configService = app.get(ConfigService);
  const port: number = configService.get('port') || 3000;

  await app.listen(port);
  logger.log(`Invoice service is running on: http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
});
