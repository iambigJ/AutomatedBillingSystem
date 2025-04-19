import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Configure RabbitMQ microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672'],
      queue: 'daily_sales_report',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Start microservice
  await app.startAllMicroservices();
  
  // Also start HTTP server for health checks/monitoring
  const httpPort = configService.get('PORT') || 3001;
  await app.listen(httpPort);
  
  Logger.log(`🚀 Email service is running on: http://localhost:${httpPort}`);
  Logger.log('🐰 RabbitMQ consumer is listening for messages');
}

bootstrap(); 