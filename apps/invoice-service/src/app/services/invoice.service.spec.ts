import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Model } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { InvoiceService } from './invoice.service';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { MyLogger } from '@mytest/common';

// Mock the MyLogger class
jest.mock('@mytest/common', () => ({
  MyLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

describe('InvoiceService', () => {
  let service: InvoiceService;
  let invoiceModel: Model<InvoiceDocument>;
  let rabbitmqClient: ClientProxy;


  const mockInvoice = {
    _id: 'mock-id',
    customer: 'Test Customer',
    amount: 100,
    date: new Date('2023-01-01'),
    items: [
      { sku: 'SKU123', name: 'Test Item', price: 50, qt: 2 },
    ],
    toObject: jest.fn().mockReturnValue({
      _id: 'mock-id',
      customer: 'Test Customer',
      amount: 100,
      date: new Date('2023-01-01'),
      items: [
        { sku: 'SKU123', name: 'Test Item', price: 50, qt: 2 },
      ],
    }),
  };

  const mockInvoiceModel = {
  
    create: jest.fn().mockResolvedValue(mockInvoice),
    constructor: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    exec: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockRabbitmqClient = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: getModelToken(Invoice.name),
          useValue: mockInvoiceModel,
        },
        {
          provide: 'RABBITMQ_SERVICE',
          useValue: mockRabbitmqClient,
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    invoiceModel = module.get<Model<InvoiceDocument>>(getModelToken(Invoice.name));
    rabbitmqClient = module.get<ClientProxy>('RABBITMQ_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createInvoiceDto: CreateInvoiceDto = {
      customer: 'Test Customer',
      amount: 100,
      reference: 'REF123',
      items: [
        { sku: 'SKU123', qt: 2 },
      ],
    };

    it('should successfully create an invoice', async () => {

      const result = await service.create(createInvoiceDto);
      
      expect(mockInvoiceModel.create).toHaveBeenCalledWith(createInvoiceDto);
      expect(result).toEqual(mockInvoice);
    });

    it('should set the current date if not provided', async () => {
      const mockDate = new Date();
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());
      
      mockInvoiceModel.create.mockResolvedValueOnce({
        ...mockInvoice,
        date: mockDate.getTime()
      });

      await service.create({ ...createInvoiceDto, date: undefined });
      
      expect(mockInvoiceModel.create).toHaveBeenCalledWith({ 
        ...createInvoiceDto, 
        date: mockDate.getTime() 
      });
    });

    it('should throw an HttpException if save fails', async () => {
      const mockError = new Error('Database error');
      mockInvoiceModel.create.mockRejectedValueOnce(mockError);

      await expect(service.create(createInvoiceDto)).rejects.toThrow(HttpException);
    });
  });


  describe('findAllWithPagination', () => {
    it('should return paginated invoices and total count', async () => {
      const mockInvoices = [mockInvoice];
      const totalCount = 20;
      
      mockInvoiceModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(totalCount)
      });
      
      mockInvoiceModel.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockInvoices)
      });

      const result = await service.findAllWithPagination(undefined, 10, 0);
      
      expect(mockInvoiceModel.countDocuments).toHaveBeenCalledWith({});
      expect(mockInvoiceModel.find).toHaveBeenCalledWith({});
      expect(result).toEqual([[mockInvoice.toObject()], totalCount]);
    });

    it('should apply date filters in string format', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      const mockInvoices = [mockInvoice];
      const totalCount = 5;
      
      mockInvoiceModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(totalCount)
      });
      
      mockInvoiceModel.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockInvoices)
      });

      const result = await service.findAllWithPagination({ start: startDate, end: endDate }, 10, 0);
      
      expect(mockInvoiceModel.countDocuments).toHaveBeenCalledWith({
        date: {
          $gte: startDate,
          $lte: endDate,
        }
      });
      expect(mockInvoiceModel.find).toHaveBeenCalledWith({
        date: {
          $gte: startDate,
          $lte: endDate,
        }
      });
      expect(result).toEqual([[mockInvoice.toObject()], totalCount]);
    });

    it('should throw an HttpException if query fails', async () => {
      const mockError = new Error('Database error');
      mockInvoiceModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(mockError)
      });

      await expect(service.findAllWithPagination()).rejects.toThrow(HttpException);
      await expect(service.findAllWithPagination()).rejects.toThrow('Failed to retrieve invoices');
    });
  });

  describe('findOne', () => {
    const invoiceId = 'mock-id';

    it('should return an invoice by ID', async () => {
      mockInvoiceModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockInvoice)
      });

      const result = await service.findOne(invoiceId);
      
      expect(mockInvoiceModel.findById).toHaveBeenCalledWith(invoiceId);
      expect(result).toEqual(mockInvoice.toObject());
    });

    it('should throw a NOT_FOUND exception if invoice does not exist', async () => {
      mockInvoiceModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.findOne(invoiceId)).rejects.toThrow(HttpException);
      await expect(service.findOne(invoiceId)).rejects.toThrow(`Invoice with ID ${invoiceId} not found`);
    });

    it('should throw an HttpException if findById fails', async () => {
      const mockError = new Error('Database error');
      mockInvoiceModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(mockError)
      });

      await expect(service.findOne(invoiceId)).rejects.toThrow(HttpException);
      await expect(service.findOne(invoiceId)).rejects.toThrow('Failed to retrieve invoice');
    });
  });

  describe('generateDailySalesReport', () => {
    beforeEach(() => {
      // Mock date for consistent testing
      jest.useFakeTimers().setSystemTime(new Date('2023-01-15T12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should generate and emit a daily sales report', async () => {
      const mockInvoices = [
        {
          ...mockInvoice,
          amount: 100,
          items: [
            { sku: 'SKU123', name: 'Test Item 1', price: 50, qt: 2 },
          ]
        },
        {
          ...mockInvoice,
          _id: 'mock-id-2',
          amount: 150,
          items: [
            { sku: 'SKU123', name: 'Test Item 1', price: 50, qt: 1 },
            { sku: 'SKU456', name: 'Test Item 2', price: 100, qt: 1 },
          ]
        }
      ];

      mockInvoiceModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockInvoices)
      });

      await service.generateDailySalesReport();
      
      // Check if find was called with correct date range
      const today = new Date('2023-01-15T12:00:00');
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).getTime();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).getTime();
      
      expect(mockInvoiceModel.find).toHaveBeenCalledWith({
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        }
      });

      // Check if report was emitted with correct data
      expect(rabbitmqClient.emit).toHaveBeenCalledWith('daily_sales_report', {
        date: expect.any(String),
        totalSales: 250, // 100 + 150
        itemSummary: [
          { sku: 'SKU123', totalQuantitySold: 3 }, // 2 + 1
          { sku: 'SKU456', totalQuantitySold: 1 },
        ],
        invoiceCount: 2,
      });
    });

    it('should throw an HttpException if report generation fails', async () => {
      const mockError = new Error('Database error');
      mockInvoiceModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(mockError)
      });

      await expect(service.generateDailySalesReport()).rejects.toThrow(HttpException);
      await expect(service.generateDailySalesReport()).rejects.toThrow('Failed to generate daily sales report');
    });
  });
});