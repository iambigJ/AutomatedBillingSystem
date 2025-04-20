import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

// Common modules
import {
  GlobalConfigModule,
  mongooseModule,
  AllExceptionsFilter,
  createRabbitMQClientModule,
} from '@carearra/common';

// App components
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { InvoiceController } from './controllers/invoice.controller';
import { InvoiceService } from './services/invoice.service';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';

@Module({
  imports: [
    // Configuration - specify the path to the config.yaml file
    GlobalConfigModule.forRoot(),

    // Database
    mongooseModule(),
    MongooseModule.forFeature([{ name: Invoice.name, schema: InvoiceSchema }]),

    // Scheduling
    ScheduleModule.forRoot(),

    // Message Queue
    createRabbitMQClientModule({
      name: 'RABBITMQ_SERVICE',
      defaultQueue: 'daily_sales_report',
    }),
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
