import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { MyLogger } from '../../../common/custom-logger/custom-logger';
import { CacheService } from '../../../common/cache/redis-service';
import { CACHE_PREFIXES } from '../../../common/cache/cache-prefixes';

@Injectable()
export class InvoiceService {
  private readonly logger = new MyLogger(InvoiceService.name);
  
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @Inject('RABBITMQ_SERVICE') private rabbitmqClient: ClientProxy,
    @Inject('RedisCacheService') private cacheService: CacheService,
  ) {
    this.logger.log('Invoice service initialized');
  }

  async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    try {
      this.logger.log(`Creating new invoice for customer: ${createInvoiceDto.customer}`);
      const createdInvoice = new this.invoiceModel(createInvoiceDto);
      const savedInvoice = await createdInvoice.save();
      
      // Invalidate cache after creating new invoice
      await this.invalidateInvoiceCache();
      
      this.logger.log(`Invoice created with ID: ${savedInvoice._id}`);
      return savedInvoice;
    } catch (error) {
      this.logger.error(`Failed to create invoice: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to create invoice',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findAll(dateFilter?: { start?: Date; end?: Date }): Promise<Invoice[]> {
    try {
      // Generate cache key based on date filter
      const cacheKey = this.generateInvoiceListCacheKey(dateFilter);
      
      // Try to get from cache first
      const cachedData = await this.cacheService.get(cacheKey);
      if (cachedData) {
        this.logger.log('Retrieved invoices from cache');
        return JSON.parse(cachedData);
      }
      
      // If not in cache, query database
      let query: any = {};
      
      if (dateFilter && (dateFilter.start || dateFilter.end)) {
        query.date = {};
        
        if (dateFilter.start) {
          query.date['$gte'] = dateFilter.start;
          this.logger.log(`Filtering invoices from: ${dateFilter.start}`);
        }
        
        if (dateFilter.end) {
          query.date['$lte'] = dateFilter.end;
          this.logger.log(`Filtering invoices to: ${dateFilter.end}`);
        }
      }
      
      const invoices = await this.invoiceModel.find(query).exec();
      this.logger.log(`Found ${invoices.length} invoices`);
      
      // Store in cache for 5 minutes
      await this.cacheService.set(cacheKey, JSON.stringify(invoices), 300);
      
      return invoices;
    } catch (error) {
      this.logger.error(`Error retrieving invoices: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve invoices',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findOne(id: string): Promise<Invoice> {
    try {
      const cacheKey = `${CACHE_PREFIXES.INVOICE}:${id}`;
      
      // Try to get from cache first
      const cachedData = await this.cacheService.get(cacheKey);
      if (cachedData) {
        this.logger.log(`Retrieved invoice ${id} from cache`);
        return JSON.parse(cachedData);
      }
      
      // If not in cache, query database
      const invoice = await this.invoiceModel.findById(id).exec();
      
      if (!invoice) {
        this.logger.warn(`Invoice with ID ${id} not found`);
        throw new HttpException(
          `Invoice with ID ${id} not found`,
          HttpStatus.NOT_FOUND
        );
      }
      
      // Store in cache for 10 minutes
      await this.cacheService.set(cacheKey, JSON.stringify(invoice), 600);
      
      this.logger.log(`Found invoice with ID: ${id}`);
      return invoice;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(`Error retrieving invoice ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve invoice',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async generateDailySalesReport() {
    try {
      this.logger.log('Generating daily sales report');
      
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      
      this.logger.log(`Querying invoices from ${startOfDay} to ${endOfDay}`);
      
      const invoices = await this.invoiceModel.find({
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }).exec();
      
      this.logger.log(`Found ${invoices.length} invoices for today's report`);
      
      // Calculate total sales amount
      const totalSales = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
      
      // Calculate per item sales summary
      const itemSummary = {};
      invoices.forEach(invoice => {
        invoice.items.forEach(item => {
          if (!itemSummary[item.sku]) {
            itemSummary[item.sku] = 0;
          }
          itemSummary[item.sku] += item.qt;
        });
      });
      
      // Convert to array format for easier consumption
      const itemSalesArray = Object.entries(itemSummary).map(([sku, totalQt]) => ({
        sku,
        totalQuantitySold: totalQt,
      }));
      
      // Prepare and send report
      const report = {
        date: today,
        totalSales,
        itemSummary: itemSalesArray,
        invoiceCount: invoices.length
      };
      
      this.logger.log(`Sending report with total sales: ${totalSales}`);
      
      // Send to RabbitMQ
      this.rabbitmqClient.emit('daily_sales_report', report);
      
      return report;
    } catch (error) {
      this.logger.error(`Failed to generate daily sales report: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to generate daily sales report',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  // Helper methods
  private generateInvoiceListCacheKey(dateFilter?: { start?: Date; end?: Date }): string {
    if (!dateFilter) {
      return `${CACHE_PREFIXES.INVOICE_LIST}:all`;
    }
    
    const startStr = dateFilter.start ? dateFilter.start.toISOString() : 'start';
    const endStr = dateFilter.end ? dateFilter.end.toISOString() : 'end';
    
    return `${CACHE_PREFIXES.INVOICE_LIST}:${startStr}:${endStr}`;
  }
  
  private async invalidateInvoiceCache(): Promise<void> {
    try {
      // Clear all invoice list caches
      const keys = await this.cacheService.keys(`${CACHE_PREFIXES.INVOICE_LIST}:*`);
      if (keys.length > 0) {
        await this.cacheService.del(...keys);
        this.logger.log(`Invalidated ${keys.length} invoice list cache entries`);
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate cache: ${error.message}`, error.stack);
    }
  }
} 