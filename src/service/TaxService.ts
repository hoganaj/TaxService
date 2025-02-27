import { DataSource, LessThanOrEqual } from 'typeorm';
import { Logger } from 'pino';
import { SaleEvent as SaleEventType , TaxPaymentEvent, Amendment as AmendmentType} from '../utils/types';
import { SaleEvent } from '../entity/SaleEvent';
import { SaleItem } from '../entity/SaleItem';
import { TaxPayment } from '../entity/TaxPayment';
import { Amendment } from '../entity/Amendment';

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

  async addAmendment(amendment: AmendmentType): Promise<void> {
    this.logger.debug({ 
      msg: 'Adding amendment',
      invoiceId: amendment.invoiceId, 
      itemId: amendment.itemId 
    });
    
    const amendmentRepo = this.dataSource.getRepository(Amendment);
    const newAmendment = new Amendment();
    newAmendment.date = new Date(amendment.date);
    newAmendment.invoiceId = amendment.invoiceId;
    newAmendment.itemId = amendment.itemId;
    newAmendment.cost = amendment.cost;
    newAmendment.taxRate = amendment.taxRate;

    await amendmentRepo.save(newAmendment);
    this.logger.info({ 
      msg: 'Amendment saved successfully',
      invoiceId: amendment.invoiceId, 
      itemId: amendment.itemId 
    });
  }

  async calculateTaxPosition(targetDateStr: string): Promise<number> {
    const targetDate = new Date(targetDateStr);
    this.logger.debug({ msg:'Calculating tax position', targetDate });

    const saleEventRepo = this.dataSource.getRepository(SaleEvent);
    const salesEvents = await saleEventRepo.find({
      where: { date: LessThanOrEqual(targetDate) },
      relations: ['items']
    });

    const taxPaymentRepo = this.dataSource.getRepository(TaxPayment);
    const taxPayments = await taxPaymentRepo.find({
      where: { date: LessThanOrEqual(targetDate) }
    });

    const amendmentRepo = this.dataSource.getRepository(Amendment);
    const amendments = await amendmentRepo.find({
      where: { date: LessThanOrEqual(targetDate) }
    });

    // Group amendments by invoice and item ID
    const amendmentMap = new Map<string, Amendment>();
    for (const amendment of amendments) {
      const key = `${amendment.invoiceId}:${amendment.itemId}`;
      const existingAmendment = amendmentMap.get(key);
      
      // Keep only the most recent amendment for each item
      if (!existingAmendment || amendment.date > existingAmendment.date) {
        amendmentMap.set(key, amendment);
      }
    }

    let totalTaxOwed = 0;

    // Process all sales events and apply amendments
    for (const saleEvent of salesEvents) {
      for (const item of saleEvent.items) {
        const key = `${saleEvent.invoiceId}:${item.itemId}`;
        const amendment = amendmentMap.get(key);
        
        const cost = amendment ? amendment.cost : item.cost;
        const taxRate = amendment ? amendment.taxRate : item.taxRate;
        
        const taxAmount = Math.round(cost * taxRate);
        totalTaxOwed += taxAmount;
        
        this.logger.debug('Tax calculated for item', { 
          invoiceId: saleEvent.invoiceId, 
          itemId: item.itemId, 
          cost, 
          taxRate, 
          taxAmount,
          amended: Boolean(amendment)
        });
      }
    }

    const totalTaxPaid = taxPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const taxPosition = totalTaxOwed - totalTaxPaid;
    
    this.logger.info('Tax position calculated', { 
      date: targetDateStr, 
      totalTaxOwed, 
      totalTaxPaid, 
      taxPosition 
    });
    
    return taxPosition;
  }

}