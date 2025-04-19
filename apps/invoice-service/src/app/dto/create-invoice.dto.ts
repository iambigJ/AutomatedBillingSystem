export class InvoiceItemDto {
  sku: string;
  qt: number;
}

export class CreateInvoiceDto {
  customer: string;
  amount: number;
  reference: string;
  date?: Date;
  items: InvoiceItemDto[];
} 