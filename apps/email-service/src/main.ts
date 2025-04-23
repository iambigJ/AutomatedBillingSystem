import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app/app.module';
import { MyLogger } from '@mytest/common';
import { RabbitMQConfig } from '@mytest/common';

async function bootstrap() {
  // Create custom logger
  const logger = new MyLogger('EmailService');

  // Create application with custom logger
  const app = await NestFactory.create(AppModule, {
    logger: logger,
  });

  const configService = app.get(ConfigService);

  const rabbitConfig = configService.get<RabbitMQConfig>('RabbitMQ');
  const rabbitUrl = rabbitConfig?.url || 'amqp://localhost:5672';
  const queueName = rabbitConfig?.queue || 'daily_sales_report';
  const queueOptions = rabbitConfig?.queueOptions || { durable: true };

  logger.log(`Connecting to RabbitMQ at ${rabbitUrl}, queue: ${queueName}`);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitUrl],
      queue: queueName,
      queueOptions: queueOptions,
      prefetchCount: 1, // Process one message at a time
    },
  });

  await app.startAllMicroservices();
  logger.log('🐰 RabbitMQ consumer is now listening for messages');

  // Also start HTTP server for health checks/monitoring
  const httpPort = configService.get<number>('port') || 3001;
  await app.listen(httpPort);

  logger.log(`🚀 Email service is running on: http://localhost:${httpPort}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start Email service:', err);
});
