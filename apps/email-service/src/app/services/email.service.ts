import { Injectable, Logger } from '@nestjs/common';
import { RmqContext, Ctx, Payload } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { Channel, ConsumeMessage } from 'amqplib';
import { ItemSummary, SalesReport } from '../types/report.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly toEmail: string;

  constructor(
    private configService: ConfigService,
    private mailerService: MailerService,
  ) {
    // Get email configuration from config.yaml
    this.fromEmail =
      this.configService.get<string>('Email.from') || 'reports@example.com';
    this.toEmail =
      this.configService.get<string>('Email.to') || 'management@example.com';

    this.logger.log('Email service initialized');
  }

  handleDailySalesReport(
    @Payload() data: SalesReport,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef() as unknown as Channel;
    const originalMsg = context.getMessage() as unknown as ConsumeMessage;

    try {
      this.logger.log(
        `Received daily sales report for ${new Date(data.date).toISOString()}`,
      );
      this.logger.log(`Total sales: ${data.totalSales}`);
      this.logger.log(`Number of invoices: ${data.invoiceCount}`);

      if (data.itemSummary && Array.isArray(data.itemSummary)) {
        data.itemSummary.forEach((item) => {
          this.logger.log(
            `SKU: ${item.sku}, Total Quantity: ${item.totalQuantitySold}`,
          );
        });
      } else {
        this.logger.warn('No item summary data available or invalid format');
      }

      this.sendEmail(data);

      this.logger.log('Message processed successfully, acknowledging');
      if (channel && typeof channel.ack === 'function') {
        channel.ack(originalMsg);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing sales report: ${errorMessage}`);

      this.logger.warn(
        'Sending negative acknowledgment, message will be requeued',
      );
      if (channel && typeof channel.nack === 'function') {
        channel.nack(originalMsg);
      }
    }
  }

  private sendEmail(data: SalesReport) {
    try {
      const subject = `Daily Sales Report - ${new Date(data.date).toLocaleDateString()}`;
      const html = this.formatEmailBody(data);
      this.mailerService
        .sendMail({
          to: this.toEmail,
          from: this.fromEmail,
          subject,
          html,
        })
        .then((res) => {
          this.logger.log(
            `Email sent successfully: ${res?.messageId || 'No message ID'}`,
          );
        })
        .catch((error) => {
          this.logger.error(
            `Failed to send email: ${error?.message || 'Unknown error'}`,
            error?.stack,
          );
        });
    } catch (error: any) {
      this.logger.error(
        `error to create html email format`,
        error?.stack,
        error?.message,
      );
      throw error;
    }
  }

  private formatEmailBody(data: SalesReport): string {
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const formattedDate = new Date(data.date).toLocaleDateString(
      'en-US',
      dateOptions,
    );

    // Format currency
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    });

    let itemSummaryTable = '';
    if (data.itemSummary && data.itemSummary.length > 0) {
      const tableRows = data.itemSummary
        .map(
          (item: ItemSummary) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.sku}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.totalQuantitySold}</td>
        </tr>
      `,
        )
        .join('');

      itemSummaryTable = `
        <h3>Item Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">SKU</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Quantity Sold</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4a6fdc; color: white; padding: 20px; text-align: center;">
          <h1>Daily Sales Report</h1>
          <p>${formattedDate}</p>
        </div>
        
        <div style="padding: 20px;">
          <h2>Summary</h2>
          <p><strong>Total Sales:</strong> ${formatter.format(data.totalSales)}</p>
           <p><strong>Invoices Generated:</strong> ${data.invoiceCount}</p>
          
          ${itemSummaryTable}
          
          <div style="background-color: #f2f2f2; padding: 15px; font-size: 12px; text-align: center; margin-top: 30px;">
            <p>This is an automated report from the Careera system.</p>
          </div>
        </div>
      </div>
    `;
  }
}
