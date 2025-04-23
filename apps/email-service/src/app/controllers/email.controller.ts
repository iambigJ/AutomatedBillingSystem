import { Controller } from '@nestjs/common';
import {
  EventPattern,
  Payload,
  Ctx,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { EmailService } from '../services/email.service';
import { MyLogger } from '@mytest/common';
import { SalesReport } from '../types/report.interface';

@Controller()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}
  private readonly logger = new MyLogger(EmailController.name);
  @EventPattern('daily_sales_report', Transport.RMQ)
  handleDailySalesReport(
    @Payload() data: SalesReport,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log('Received daily sales report', data);
    this.emailService.handleDailySalesReport(data, context);
  }
}
