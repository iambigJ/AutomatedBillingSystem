import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app/app.module';
import { MyLogger } from '../common/custom-logger/custom-logger';
import { AllExceptionsFilter } from '../common/filters/global-exeption';

async function bootstrap() {
  // Create custom logger
  const logger = new MyLogger('Bootstrap');

  // Create application with custom logger
  const app = await NestFactory.create(AppModule, {
    logger: logger,
  });

  // Enable CORS
  app.enableCors();

  // Apply global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

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
