export interface Item {
  itemId: string;
  cost: number;
  taxRate: number;
}

export interface SaleEvent {
  eventType: 'SALES';
  date: string;
  invoiceId: string;
  items: Item[];
}

export interface TaxPaymentEvent {
  eventType: 'TAX_PAYMENT';
  date: string;
  amount: number;
}

export type Transaction = SaleEvent | TaxPaymentEvent;

export interface Amendment {
  date: string;
  invoiceId: string;
  itemId: string;
  cost: number;
  taxRate: number;
}