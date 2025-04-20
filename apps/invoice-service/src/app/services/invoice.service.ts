import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { MyLogger } from '@carearra/common';
import { start } from 'repl';

interface QueryWithDate {
  date?: {
    $gte?: Date;
    $lte?: Date;
  };
}

/**
 * Converts a Date object to UTC ISO string
 * @param date The date to convert
 * @returns The UTC ISO string
 */
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

      const createdInvoice = new this.invoiceModel(createInvoiceDto);
      const savedInvoice = await createdInvoice.save();

      this.logger.log(`Invoice created with ID: ${String(savedInvoice._id)}`);
      return savedInvoice;
    } catch (error: any) {
      this.logger.error(`Failed to create invoice:`, error?.stack);
      throw new HttpException(
        'Failed to create invoice',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(dateFilter?: { start?: Date; end?: Date }): Promise<Invoice[]> {
    try {
      const query: QueryWithDate = {};

      if (dateFilter && (dateFilter.start || dateFilter.end)) {
        query.date = {};

        if (dateFilter.start) {
          query.date.$gte = dateFilter.start;
          this.logger.log(
            `Filtering invoices from: ${toUTCString(dateFilter.start)}`,
          );
        }

        if (dateFilter.end) {
          query.date.$lte = dateFilter.end;
          this.logger.log(
            `Filtering invoices to: ${toUTCString(dateFilter.end)}`,
          );
        }
      }

      const invoices = await this.invoiceModel.find(query).exec();
      this.logger.log(`Found ${invoices.length} invoices`);

      const invoicesWithUTCDates = invoices.map((invoice) => {
        const formattedInvoice = invoice.toObject();
        return formattedInvoice;
      });

      return invoicesWithUTCDates;
    } catch (error: any) {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Unknown error';

      const errorStack =
        error && typeof error === 'object' && 'stack' in error
          ? String(error.stack)
          : '';

      this.logger.error(
        `Error retrieving invoices: ${errorMessage}`,
        errorStack,
      );
      throw new HttpException(
        'Failed to retrieve invoices',
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

      // Convert all dates to UTC format
      const invoicesWithUTCDates = invoices.map((invoice) => {
        return invoice.toObject();
      });

      return [invoicesWithUTCDates, totalCount];
    } catch (error: any) {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Unknown error';

      this.logger.error(
        `Error retrieving invoices: ${errorMessage}`,
        error?.stack,
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

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
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

  //---------alternative aggregation pipeline---------
  // async generateDailySalesReport() {
  //   this.logger.log('Generating daily sales report using aggregation pipeline');

  //   const today = new Date();
  //   // Ensure startOfDay and endOfDay correctly encompass the entire day in the relevant timezone (consider UTC if applicable)
  //   const startOfDay = new Date(today);
  //   startOfDay.setHours(0, 0, 0, 0);

  //   const endOfDay = new Date(today);
  //   endOfDay.setHours(23, 59, 59, 999);

  //   this.logger.log(`Querying invoices from ${startOfDay} to ${endOfDay}`);

  //   try {
  //     const aggregationResult = await this.invoiceModel
  //       .aggregate<AggregatedReportData>([
  //         // Stage 1: Match invoices within the date range
  //         {
  //           $match: {
  //             date: {
  //               $gte: startOfDay,
  //               $lte: endOfDay,
  //             },
  //           },
  //         },
  //         // Stage 2: Use $facet to run multiple aggregation pipelines in parallel
  //         {
  //           $facet: {
  //             // Sub-pipeline 1: Calculate total sales and invoice count
  //             salesData: [
  //               {
  //                 $group: {
  //                   _id: null, // Group all matched documents together
  //                   totalSales: { $sum: '$amount' },
  //                   // Collect unique invoice IDs to count them accurately
  //                   invoiceIds: { $addToSet: '$_id' },
  //                 },
  //               },
  //               {
  //                 $project: {
  //                   _id: 0, // Exclude the _id field
  //                   totalSales: 1,
  //                   invoiceCount: { $size: '$invoiceIds' }, // Calculate count from the set size
  //                 },
  //               },
  //             ],
  //             // Sub-pipeline 2: Calculate item summaries
  //             itemData: [
  //               { $unwind: '$items' }, // Deconstruct the items array
  //               {
  //                 $group: {
  //                   _id: '$items.sku', // Group by item SKU
  //                   totalQuantitySold: { $sum: '$items.qt' }, // Sum quantities per SKU
  //                 },
  //               },
  //               {
  //                 $project: {
  //                   _id: 0, // Exclude the default _id
  //                   sku: '$_id', // Rename _id (which is the sku) to sku
  //                   totalQuantitySold: 1,
  //                 },
  //               },
  //               { $sort: { sku: 1 } }, // Optional: sort items by SKU
  //             ],
  //           },
  //         },
  //         // Stage 3: Reshape the $facet output
  //         {
  //           $project: {
  //             // Extract results, handling cases where no invoices are found (salesData might be empty)
  //             salesInfo: { $first: '$salesData' }, // Get the first (and only) element from salesData array
  //             itemSummary: '$itemData',
  //           },
  //         },
  //         {
  //           $project: {
  //             // Assign defaults if salesInfo is null/missing (no invoices found)
  //             totalSales: { $ifNull: ['$salesInfo.totalSales', 0] },
  //             invoiceCount: { $ifNull: ['$salesInfo.invoiceCount', 0] },
  //             itemSummary: 1, // Pass itemSummary through
  //           },
  //         },
  //       ])
  //       .exec();

  //     // aggregationResult is an array, we expect one result document
  //     const reportData = aggregationResult[0];

  //     if (!reportData) {
  //       // This case should ideally be handled by the $project stage defaults,
  //       // but adding a check for robustness.
  //       this.logger.warn('No invoices found for today. Report will be empty.');
  //       const emptyReport = {
  //         date: today,
  //         totalSales: 0,
  //         itemSummary: [],
  //         invoiceCount: 0,
  //       };
  //       // Decide if you want to emit an empty report or just log and exit
  //       // this.rabbitmqClient.emit('daily_sales_report', emptyReport);
  //       return; // Or emit empty report
  //     }

  //     // Prepare the final report object
  //     const report = {
  //       date: today,
  //       totalSales: reportData.totalSales,
  //       itemSummary: reportData.itemSummary, // Already in the desired array format
  //       invoiceCount: reportData.invoiceCount,
  //     };

  //     this.logger.log(
  //       `Aggregation complete. Sending report - Invoices: ${report.invoiceCount}, Total Sales: ${report.totalSales}`,
  //     );

  //     // Emit the report via RabbitMQ (ensure client is injected)
  //     // this.rabbitmqClient.emit('daily_sales_report', report);

  //     this.logger.log('Daily sales report generated and emitted successfully.');
  //     // No return value needed if just emitting

  //   } catch (error: any) {
  //     this.logger.error(
  //       `Failed to generate daily sales report via aggregation: ${error.message}`,
  //       error.stack,
  //     );
  //     // Throw a more generic error or a custom service error
  //     // Avoid throwing HttpException directly from service unless intended for specific HTTP handling
  //     throw new InternalServerErrorException(
  //       'Failed to generate daily sales report',
  //     );
  //   }
  // }
}
