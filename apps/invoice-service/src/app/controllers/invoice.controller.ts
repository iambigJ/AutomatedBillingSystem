import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { InvoiceService } from '../services/invoice.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { Invoice } from '../schemas/invoice.schema';
import { MyLogger } from '../../../common/custom-logger/custom-logger';

@Controller('invoices')
export class InvoiceController {
  private readonly logger = new MyLogger(InvoiceController.name);

  constructor(private readonly invoiceService: InvoiceService) {
    this.logger.log('Invoice controller initialized');
  }

  @Post()
  async create(@Body() createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    try {
      this.logger.log('Creating new invoice');
      return await this.invoiceService.create(createInvoiceDto);
    } catch (error) {
      this.logger.error(`Error creating invoice: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to create invoice', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<Invoice[]> {
    try {
      this.logger.log(`Retrieving invoices - filters: startDate=${startDate}, endDate=${endDate}`);
      
      const dateFilter: { start?: Date; end?: Date } = {};
      
      if (startDate) {
        try {
          dateFilter.start = new Date(startDate);
        } catch (error) {
          throw new HttpException(`Invalid startDate format: ${startDate}`, HttpStatus.BAD_REQUEST);
        }
      }
      
      if (endDate) {
        try {
          dateFilter.end = new Date(endDate);
        } catch (error) {
          throw new HttpException(`Invalid endDate format: ${endDate}`, HttpStatus.BAD_REQUEST);
        }
      }
      
      return await this.invoiceService.findAll(
        startDate || endDate ? dateFilter : undefined
      );
    } catch (error) {
      this.logger.error(`Error retrieving invoices: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to retrieve invoices', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Invoice> {
    try {
      this.logger.log(`Retrieving invoice with ID: ${id}`);
      return await this.invoiceService.findOne(id);
    } catch (error) {
      this.logger.error(`Error retrieving invoice ${id}: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to retrieve invoice', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('report/generate')
  async generateReport(): Promise<any> {
    try {
      this.logger.log('Manually generating sales report');
      return await this.invoiceService.generateDailySalesReport();
    } catch (error) {
      this.logger.error(`Error generating report: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to generate sales report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 