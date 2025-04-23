import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { RmqContext } from '@nestjs/microservices';
import { EmailService } from './email.service';
import { SalesReport } from '../types/report.interface';

// Mock the Logger
jest.mock('@mytest/common', () => ({
    MyLogger: jest.fn().mockImplementation(() => ({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    })),
  }));

describe('EmailService', () => {
  let service: EmailService;
  let mailerService: MailerService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'Email.from') return 'test@example.com';
      if (key === 'Email.to') return 'recipient@example.com';
      return null;
    }),
  };

  const mockMailerService = {
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  };

  const mockSalesReport: SalesReport = {
    date: new Date('2023-01-15').toISOString(),
    totalSales: 1250.50,
    invoiceCount: 5,
    itemSummary: [
      { sku: 'SKU123', totalQuantitySold: 10 },
      { sku: 'SKU456', totalQuantitySold: 5 },
    ],
  };

  const mockRmqContext = {
    getChannelRef: jest.fn().mockReturnValue({
      ack: jest.fn(),
      nack: jest.fn(),
    }),
    getMessage: jest.fn().mockReturnValue({
      content: Buffer.from(JSON.stringify(mockSalesReport)),
    }),
  } as unknown as RmqContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mailerService = module.get<MailerService>(MailerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should use config service to get email configuration', () => {
      expect(configService.get).toHaveBeenCalledWith('Email.from');
      expect(configService.get).toHaveBeenCalledWith('Email.to');
    });

    it('should use default values if config is not available', async () => {
      // Mock for testing default values
      jest.spyOn(mockConfigService, 'get').mockReturnValue(undefined);

      const moduleForDefaults: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: MailerService,
            useValue: mockMailerService,
          },
        ],
      }).compile();

      const serviceWithDefaults = moduleForDefaults.get<EmailService>(EmailService);
      expect(serviceWithDefaults).toBeDefined();
    });
  });

  describe('handleDailySalesReport', () => {
    it('should process the report and acknowledge message', () => {
      const sendEmailSpy = jest.spyOn<any, any>(service, 'sendEmail');
      const channelAckSpy = mockRmqContext.getChannelRef().ack;

      service.handleDailySalesReport(mockSalesReport, mockRmqContext);

      expect(sendEmailSpy).toHaveBeenCalledWith(mockSalesReport);
      expect(channelAckSpy).toHaveBeenCalled();
    });

    it('should handle errors and nack the message', () => {
      const error = new Error('Test error');
      jest.spyOn<any, any>(service, 'sendEmail').mockImplementation(() => {
        throw error;
      });
      const channelNackSpy = mockRmqContext.getChannelRef().nack;

      service.handleDailySalesReport(mockSalesReport, mockRmqContext);

      expect(channelNackSpy).toHaveBeenCalled();
    });
  });

  describe('sendEmail', () => {
    it('should format and send an email with the report data', async () => {
      // Access private method using any type
      const sendEmailMethod = (service as any).sendEmail.bind(service);
      
      // Using the same mock data from above
      await sendEmailMethod(mockSalesReport);

      expect(mailerService.sendMail).toHaveBeenCalled();
    });

  });

  describe('formatEmailBody', () => {
    it('should format the email body with sales data', () => {
      // Access private method using any type
      const formatMethod = (service as any).formatEmailBody.bind(service);
      
      const html = formatMethod(mockSalesReport);
      
      // Check that the HTML contains important elements
      expect(html).toContain('Daily Sales Report');
      expect(html).toContain(mockSalesReport.invoiceCount.toString());
      
      // Check that the item summary is included
      mockSalesReport.itemSummary.forEach(item => {
        expect(html).toContain(item.sku);
        expect(html).toContain(item.totalQuantitySold.toString());
      });
    });

    it('should handle missing item summary data', () => {
      // Access private method using any type
      const formatMethod = (service as any).formatEmailBody.bind(service);
      
      const reportWithoutItems: any = { ...mockSalesReport, itemSummary: [] };
      const html = formatMethod(reportWithoutItems);
      
      // Should still generate HTML without item table
      expect(html).toContain('Daily Sales Report');
      expect(html).not.toContain('Item Summary');
    });
  });
}); 