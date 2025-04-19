import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app/app.module';
import { MyLogger } from '@carearra/common';

async function bootstrap() {
  // Create custom logger
  const logger = new MyLogger('InvoiceService');

  // Create application with custom logger
  const app = await NestFactory.create(AppModule, {
    logger: logger,
  });

  // Enable CORS
  app.enableCors();

  // Apply global pipes and filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Get configuration
  const configService = app.get(ConfigService);
  const port: number = configService.get('port') || 3000;

  // Start server
  await app.listen(port);
  logger.log(`Invoice service is running on: http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
});
