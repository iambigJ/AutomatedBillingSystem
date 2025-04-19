import { Injectable, Logger } from '@nestjs/common';
import { Transport, RmqContext, Ctx, MessagePattern, Payload } from '@nestjs/microservices';

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

  @MessagePattern('daily_sales_report', Transport.RMQ)
  async handleDailySalesReport(
    @Payload() data: SalesReport,
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(`Received daily sales report for ${data.date}`);
      this.logger.log(`Total sales: ${data.totalSales}`);
      this.logger.log(`Number of invoices: ${data.invoiceCount}`);
      
      // Log item summary
      data.itemSummary.forEach(item => {
        this.logger.log(`SKU: ${item.sku}, Total Quantity: ${item.totalQuantitySold}`);
      });
      
      // Here you would implement the actual email sending logic
      // For example, using nodemailer or a third-party email service
      await this.sendEmail(data);
      
      // Acknowledge the message
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(`Error processing sales report: ${error.message}`);
      // Negative acknowledgment - message will be requeued
      channel.nack(originalMsg);
    }
  }

  private async sendEmail(data: SalesReport): Promise<void> {
    // This is where you would implement the actual email sending logic
    // For this example, we're just logging the action
    this.logger.log('Sending email with sales report...');
    
    const emailSubject = `Daily Sales Report - ${new Date(data.date).toLocaleDateString()}`;
    const emailBody = this.formatEmailBody(data);
    
    // Example of how you would send an email using a library like nodemailer
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail({
    //   from: 'reports@yourcompany.com',
    //   to: 'management@yourcompany.com',
    //   subject: emailSubject,
    //   html: emailBody,
    // });
    
    this.logger.log('Email sent successfully');
  }

  private formatEmailBody(data: SalesReport): string {
    let itemsTable = '';
    
    data.itemSummary.forEach(item => {
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