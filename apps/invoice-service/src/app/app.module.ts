import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

// Common modules
import { GlobalConfigModule } from '../../common/shared/config/config-module';
import { mongooseModule } from '../../common/shared/mongose/mongose-module';
import { RedisCacheModule } from '../../common/cache/redis-module';
import { AllExceptionsFilter } from '../../common/filters/global-exeption';

// App components
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvoiceController } from './controllers/invoice.controller';
import { InvoiceService } from './services/invoice.service';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';

@Module({
  imports: [
    // Configuration
    GlobalConfigModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Database
    mongooseModule(),
    MongooseModule.forFeature([{ name: Invoice.name, schema: InvoiceSchema }]),

    // Cache
    RedisCacheModule,

    // Scheduling
    ScheduleModule.forRoot(),

    // Message Queue
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => {
          const rabbitConfig = configService.get('RabbitMQ');
          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitConfig?.url || 'amqp://localhost:5672'],
              queue: rabbitConfig?.queue || 'daily_sales_report',
              queueOptions: rabbitConfig?.queueOptions || { durable: true },
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AppController, InvoiceController],
  providers: [
    AppService,
    InvoiceService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
