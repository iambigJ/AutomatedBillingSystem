import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { InvoiceService } from '../services/invoice.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { Invoice } from '../schemas/invoice.schema';
import { MyLogger } from '@carearra/common';

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
      throw new HttpException(
        'Failed to create invoice',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(
    @Query('startDate') startDate?: Date, // Pipe handles parsing/validation
    @Query('endDate') endDate?: Date, // Pipe handles parsing/validation
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    const dateFilter =
      startDate || endDate ? { start: startDate, end: endDate } : undefined;
    const [data, total] = await this.invoiceService.findAllWithPagination(
      dateFilter,
      limit,
      offset,
    );
    return {
      data,
      total,
      limit,
      offset,
    };
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
      throw new HttpException(
        'Failed to retrieve invoice',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
