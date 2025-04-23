import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { MyLogger } from '@mytest/common';

interface QueryWithDate {
  date?: {
    $gte?: Date;
    $lte?: Date;
  };
}

function toUTCString(date: Date): string {
  return date.toISOString();
}

@Injectable()
export class InvoiceService {
  private readonly logger = new MyLogger(InvoiceService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @Inject('RABBITMQ_SERVICE') private rabbitmqClient: ClientProxy,
  ) {
    this.logger.log('Invoice service initialized');
  }

  async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    try {
      this.logger.log(
        `Creating new invoice for customer: ${createInvoiceDto.customer}`,
      );

      if (!createInvoiceDto.date) {
        createInvoiceDto.date = Date.now();
      }

      const createdInvoice = await this.invoiceModel.create(createInvoiceDto);

      this.logger.log(`Invoice created with`);
      return createdInvoice;
    } catch (error: any) {
      this.logger.error(
        `Failed to create invoice:`,
        error?.stack,
        error?.message,
      );
      throw new HttpException(
        'Failed to create invoice',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllWithPagination(
    dateFilter?: { start?: string; end?: string },
    limit: number = 10,
    offset: number = 0,
  ): Promise<[Invoice[], number]> {
    try {
      const query: QueryWithDate = {};
      if (dateFilter && (dateFilter.start || dateFilter.end)) {
        query.date = {};

        if (dateFilter.start) {
          query.date.$gte = dateFilter.start as unknown as Date;
          this.logger.log(`Filtering invoices from ${dateFilter.start}`);
        }

        if (dateFilter.end) {
          query.date.$lte = dateFilter.end as unknown as Date;
          this.logger.log(`Filtering invoices to ${dateFilter.end}`);
        }
      }

      const totalCount = await this.invoiceModel.countDocuments(query).exec();

      const invoices = await this.invoiceModel
        .find(query)
        .skip(offset)
        .limit(limit)
        .exec();

      this.logger.log(
        `Found ${invoices.length} invoices (offset: ${offset}, limit: ${limit}, total: ${totalCount})`,
      );

      const invoicesWithUTCDates = invoices.map((invoice) => {
        return invoice.toObject();
      });

      return [invoicesWithUTCDates, totalCount];
    } catch (error: any) {
      this.logger.error(
        `Error retrieving invoices`,
        error?.stack,
        error?.message,
      );
      throw new HttpException(
        'Failed to retrieve invoices',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string): Promise<Invoice> {
    try {
      const invoice = await this.invoiceModel.findById(id).exec();

      if (!invoice) {
        this.logger.warn(`Invoice with ID ${id} not found`);
        throw new HttpException(
          `Invoice with ID ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.log(`Found invoice with ID: ${id}`);

      return invoice.toObject();
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error retrieving invoice ${id}`,
        error?.stack,
        error?.message,
      );
      throw new HttpException(
        'Failed to retrieve invoice',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async generateDailySalesReport() {
    try {
      this.logger.log('Generating daily sales report');

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).getTime();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).getTime();

      this.logger.log(`Querying invoices from ${startOfDay} to ${endOfDay}`);

      const invoices = await this.invoiceModel
        .find({
          date: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        })
        .exec();

      this.logger.log(`Found ${invoices.length} invoices for today's report`);

      const totalSales = invoices.reduce(
        (sum, invoice) => sum + invoice.amount,
        0,
      );

      const itemSummary: Record<string, number> = {};
      invoices.forEach((invoice) => {
        invoice.items.forEach((item) => {
          if (!itemSummary[item.sku]) {
            itemSummary[item.sku] = 0;
          }
          itemSummary[item.sku] += item.qt;
        });
      });

      const itemSalesArray = Object.entries(itemSummary).map(
        ([sku, totalQt]) => ({
          sku,
          totalQuantitySold: totalQt,
        }),
      );

      const report = {
        date: toUTCString(today),
        totalSales,
        itemSummary: itemSalesArray,
        invoiceCount: invoices.length,
      };

      this.logger.log(`Sending report with total sales: ${totalSales}`);

      this.rabbitmqClient.emit('daily_sales_report', report);
    } catch (error: any) {
      this.logger.error(
        `Failed to generate daily sales report`,
        error?.stack,
        error?.message,
      );
      throw new HttpException(
        'Failed to generate daily sales report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
// expect(mockInvoiceModel.new).toHaveBeenCalledWith(createInvoiceDto);
// expect(mockCreatedInvoice.save).toHaveBeenCalled();
// expect(result).toEqual(mockInvoice);
