import { DataSource } from 'typeorm';
import { Logger } from 'pino';
import { SaleEvent as SaleEventType , TaxPaymentEvent, } from './types';
import { SaleEvent } from './entity/SaleEvent';
import { SaleItem } from './entity/SaleItem';
import { TaxPayment } from './entity/TaxPayment';

export class TaxService {
  private dataSource: DataSource;
  private logger: Logger;

  constructor(dataSource: DataSource, logger: Logger) {
    this.dataSource = dataSource;
    this.logger = logger;
  }

  async addSaleEvent(event: SaleEventType): Promise<void> {
    this.logger.debug({ msg: 'Adding sale event', invoiceId: event.invoiceId });
    
    const saleEventRepo = this.dataSource.getRepository(SaleEvent);
    const saleEvent = new SaleEvent();
    saleEvent.date = new Date(event.date);
    saleEvent.invoiceId = event.invoiceId;
    saleEvent.items = event.items.map(item => {
      const saleItem = new SaleItem();
      saleItem.itemId = item.itemId;
      saleItem.cost = item.cost;
      saleItem.taxRate = item.taxRate;
      return saleItem;
    });

    await saleEventRepo.save(saleEvent);
    this.logger.info({ msg: 'Sale event saved successfully', invoiceId: event.invoiceId });
  }

  async addTaxPayment(event: TaxPaymentEvent): Promise<void> {
    this.logger.debug({ msg: 'Adding tax payment', amount: event.amount });
    
    const taxPaymentRepo = this.dataSource.getRepository(TaxPayment);
    const taxPayment = new TaxPayment();
    taxPayment.date = new Date(event.date);
    taxPayment.amount = event.amount;

    await taxPaymentRepo.save(taxPayment);
    this.logger.info({ msg: 'Tax payment saved successfully', date: event.date, amount: event.amount });
  }

}