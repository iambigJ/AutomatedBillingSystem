export interface ItemSummary {
  sku: string;
  totalQuantitySold: number;
}

export interface SalesReport {
  date: string | Date;
  totalSales: number;
  invoiceCount: number;
  itemSummary: ItemSummary[];
}

export interface EmailResult {
  messageId?: string;
}
