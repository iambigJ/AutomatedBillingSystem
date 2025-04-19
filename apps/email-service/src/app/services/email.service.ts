import { Injectable, Logger } from '@nestjs/common';
import {
  Transport,
  RmqContext,
  Ctx,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import * as SendGrid from '@sendgrid/mail';

interface SalesReport {
  date: Date;
  totalSales: number;
  itemSummary: Array<{
    sku: string;
    totalQuantitySold: number;
  }>;
  invoiceCount: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    // Initialize SendGrid with API key
    const sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (sendgridApiKey) {
      SendGrid.setApiKey(sendgridApiKey);
      this.logger.log('SendGrid initialized with API key');
    } else {
      this.logger.warn(
        'SendGrid API key not found, email sending will be mocked',
      );
    }
  }

  @MessagePattern('daily_sales_report', Transport.RMQ)
  async handleDailySalesReport(
    @Payload() data: SalesReport,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(`Received daily sales report for ${data.date}`);
      this.logger.log(`Total sales: ${data.totalSales}`);
      this.logger.log(`Number of invoices: ${data.invoiceCount}`);

      data.itemSummary.forEach((item) => {
        this.logger.log(
          `SKU: ${item.sku}, Total Quantity: ${item.totalQuantitySold}`,
        );
      });

      await this.sendEmail(data);

      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(`Error processing sales report: ${error.message}`);
      // Negative acknowledgment - message will be requeued
      channel.nack(originalMsg);
    }
  }

  private async sendEmail(data: SalesReport): Promise<void> {
    const emailSubject = `Daily Sales Report - ${new Date(data.date).toLocaleDateString()}`;
    const emailBody = this.formatEmailBody(data);

    const fromEmail =
      this.configService.get<string>('EMAIL_FROM') || 'reports@example.com';
    const toEmail =
      this.configService.get<string>('EMAIL_TO') || 'management@example.com';

    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: emailSubject,
      html: emailBody,
    };

    try {
      const sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY');

      if (sendgridApiKey) {
        // Send email using SendGrid
        this.logger.log(`Sending email to ${toEmail} via SendGrid`);
        await SendGrid.send(msg);
        this.logger.log('Email sent successfully with SendGrid');
      } else {
        // Mock email sending if no API key is available
        this.logger.log(
          `[MOCK] Would send email to ${toEmail} with subject: ${emailSubject}`,
        );
        this.logger.debug(`[MOCK] Email content: ${emailBody}`);
        // Simulate a delay to mimic actual sending
        await new Promise((resolve) => setTimeout(resolve, 500));
        this.logger.log('[MOCK] Email sending simulated successfully');
      }
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error; // Rethrow to be caught by the caller
    }
  }

  private formatEmailBody(data: SalesReport): string {
    let itemsTable = '';

    data.itemSummary.forEach((item) => {
      itemsTable += `
        <tr>
          <td>${item.sku}</td>
          <td>${item.totalQuantitySold}</td>
        </tr>
      `;
    });

    return `
      <h1>Daily Sales Report - ${new Date(data.date).toLocaleDateString()}</h1>
      <p><strong>Total Sales:</strong> $${data.totalSales.toFixed(2)}</p>
      <p><strong>Number of Invoices:</strong> ${data.invoiceCount}</p>
      
      <h2>Items Sold</h2>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr>
          <th>SKU</th>
          <th>Quantity Sold</th>
        </tr>
        ${itemsTable}
      </table>
    `;
  }
}
