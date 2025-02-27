import { DataSource } from 'typeorm';
import { TaxService } from './TaxService';
import { SaleEvent } from './entity/SaleEvent';
import { TaxPayment } from './entity/TaxPayment';
import { Amendment } from './entity/Amendment';
import { SaleItem } from './entity/SaleItem';
import pino from 'pino';

const logger = pino({ level: 'silent' });

const testDataSource = new DataSource({
  type: 'sqlite',
  database: ':memory:',
  entities: [SaleEvent, SaleItem, TaxPayment, Amendment],
  synchronize: true,
  dropSchema: true,
  logging: false
});

describe('TaxService', () => {
  let dataSource: DataSource;
  let taxService: TaxService;

  beforeAll(async () => {
    dataSource = await testDataSource.initialize();
    taxService = new TaxService(dataSource, logger);
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });
  
  beforeEach(async () => {
    // Clear all tables before each test
    await dataSource.getRepository(Amendment).clear();
    await dataSource.getRepository(SaleItem).clear();
    await dataSource.getRepository(SaleEvent).clear();
    await dataSource.getRepository(TaxPayment).clear();
  });

  // Sale Event
  test('should add a sale event and verify it was persisted', async () => {

    const saleEvent = {
      eventType: 'SALES' as const,
      date: '2024-02-22T17:29:39Z',
      invoiceId: 'test-invoice-123',
      items: [{
        itemId: 'test-item-1',
        cost: 1000,
        taxRate: 0.2
      }]
    };
  
    await taxService.addSaleEvent(saleEvent);
    
    const saleEventRepo = dataSource.getRepository(SaleEvent);
    const savedEvent = await saleEventRepo.findOne({
      where: { invoiceId: 'test-invoice-123' },
      relations: ['items']
    });
    
    
    expect(savedEvent).not.toBeNull();
    expect(savedEvent?.invoiceId).toBe('test-invoice-123');
    expect(savedEvent?.date.toISOString()).toContain('2024-02-22');
    expect(savedEvent?.items).toHaveLength(1);
    expect(savedEvent?.items[0].itemId).toBe('test-item-1');
    expect(savedEvent?.items[0].cost).toBe(1000);
    expect(savedEvent?.items[0].taxRate).toBe(0.2);
  });

  // Tax Payment
  test('should add a tax payment and verify it was persisted', async () => {

    const taxPayment = {
      eventType: 'TAX_PAYMENT' as const,
      date: '2024-02-22T17:29:39Z',
      amount: 250
    };
  
    await taxService.addTaxPayment(taxPayment);
    
    const taxPaymentRepo = dataSource.getRepository(TaxPayment);
    const savedPayment = await taxPaymentRepo.findOne({
      where: {
        date: new Date('2024-02-22T17:29:39Z'),
        amount: 250
      }
    });
    
    expect(savedPayment).not.toBeNull();
    expect(savedPayment?.amount).toBe(250);
    expect(savedPayment?.date.toISOString()).toContain('2024-02-22');
  });

  // Amendment

  test('should add an amendment and verify it was persisted', async () => {
  
    const amendment = {
      eventType: 'AMENDMENT' as const,
      date: '2024-02-23T14:15:30Z',
      invoiceId: 'test-invoice-123',
      itemId: 'test-item-1',
      cost: 1500,
      taxRate: 0.25
    };
  
    // Add the amendment
    await taxService.addAmendment(amendment);
    
    // Retrieve the amendment from the database to verify it was saved
    const amendmentRepo = dataSource.getRepository(Amendment);
    const savedAmendment = await amendmentRepo.findOne({
      where: {
        invoiceId: 'test-invoice-123',
        itemId: 'test-item-1'
      }
    });
    
    // Verify the amendment exists and has correct properties
    expect(savedAmendment).not.toBeNull();
    expect(savedAmendment?.invoiceId).toBe('test-invoice-123');
    expect(savedAmendment?.itemId).toBe('test-item-1');
    expect(savedAmendment?.cost).toBe(1500);
    expect(savedAmendment?.taxRate).toBe(0.25);
    expect(savedAmendment?.date.toISOString()).toContain('2024-02-23');
  });


  // Tax Position
  test('should calculate zero tax position with no transactions', async () => {
    const position = await taxService.calculateTaxPosition('2024-02-22T17:29:39Z');
    expect(position).toBe(0);
  });

  test('should calculate tax position with a single sale event', async () => {
    const saleEvent = {
      eventType: 'SALES' as const,
      date: '2024-02-22T17:29:39Z',
      invoiceId: '3419027d-960f-4e8f-b8b7-f7b2b4791824',
      items: [{
        itemId: '02db47b6-fe68-4005-a827-24c6e962f3df',
        cost: 1000,
        taxRate: 0.2
      }]
    };

    await taxService.addSaleEvent(saleEvent);
    
    // Tax should be 1000 * 0.2 = 200
    const position = await taxService.calculateTaxPosition('2024-02-22T18:00:00Z');
    expect(position).toBe(200);
  });

  test('should calculate tax position with multiple sale events', async () => {
    const saleEvent1 = {
      eventType: 'SALES' as const,
      date: '2024-02-22T17:29:39Z',
      invoiceId: '3419027d-960f-4e8f-b8b7-f7b2b4791824',
      items: [{
        itemId: '02db47b6-fe68-4005-a827-24c6e962f3df',
        cost: 1000,
        taxRate: 0.2
      }]
    };

    const saleEvent2 = {
      eventType: 'SALES' as const,
      date: '2024-02-24T15:49:39Z',
      invoiceId: '5559027d-960f-4e8f-b8b7-f7b2b4791824',
      items: [{
        itemId: '56db47b6-fe68-4005-a827-24c6e962f3df',
        cost: 2350,
        taxRate: 0.2
      }]
    };

    await taxService.addSaleEvent(saleEvent1);
    await taxService.addSaleEvent(saleEvent2);
    
    // Tax should be (1000 * 0.2) + (2350 * 0.2) = 200 + 470 = 670
    const position = await taxService.calculateTaxPosition('2024-02-25T18:00:00Z');
    expect(position).toBe(670);
  });

  test('should calculate tax position with a sale event with multiple items', async () => {
    const saleEvent = {
      eventType: 'SALES' as const,
      date: '2024-02-22T17:29:39Z',
      invoiceId: '3419027d-960f-4e8f-b8b7-f7b2b4791824',
      items: [
        {
          itemId: '02db47b6-fe68-4005-a827-24c6e962f3df',
          cost: 1000,
          taxRate: 0.2
        },
        {
          itemId: '12345678-fe68-4005-a827-24c6e962f3df',
          cost: 2000,
          taxRate: 0.1
        }
      ]
    };

    await taxService.addSaleEvent(saleEvent);
    
    // Tax should be (1000 * 0.2) + (2000 * 0.1) = 200 + 200 = 400
    const position = await taxService.calculateTaxPosition('2024-02-22T18:00:00Z');
    expect(position).toBe(400);
  });

  test('should calculate tax position with a tax payment', async () => {
    const saleEvent = {
      eventType: 'SALES' as const,
      date: '2024-02-22T17:29:39Z',
      invoiceId: '3419027d-960f-4e8f-b8b7-f7b2b4791824',
      items: [{
        itemId: '02db47b6-fe68-4005-a827-24c6e962f3df',
        cost: 1000,
        taxRate: 0.2
      }]
    };

    const taxPayment = {
      eventType: 'TAX_PAYMENT' as const,
      date: '2024-02-22T18:00:00Z',
      amount: 150
    };

    await taxService.addSaleEvent(saleEvent);
    await taxService.addTaxPayment(taxPayment);
    
    // Tax should be (1000 * 0.2) - 150 = 200 - 150 = 50
    const position = await taxService.calculateTaxPosition('2024-02-22T19:00:00Z');
    expect(position).toBe(50);
  });

  test('should respect the date in tax position queries', async () => {
    const saleEvent = {
      eventType: 'SALES' as const,
      date: '2024-02-22T17:29:39Z',
      invoiceId: '3419027d-960f-4e8f-b8b7-f7b2b4791824',
      items: [{
        itemId: '02db47b6-fe68-4005-a827-24c6e962f3df',
        cost: 1000,
        taxRate: 0.2
      }]
    };

    const taxPayment = {
      eventType: 'TAX_PAYMENT' as const,
      date: '2024-02-22T18:00:00Z',
      amount: 150
    };

    await taxService.addSaleEvent(saleEvent);
    await taxService.addTaxPayment(taxPayment);
    
    // Before the sale event - should be 0
    expect(await taxService.calculateTaxPosition('2024-02-22T17:00:00Z')).toBe(0);
    
    // After the sale event, before the tax payment - should be 200
    expect(await taxService.calculateTaxPosition('2024-02-22T17:30:00Z')).toBe(200);
    
    // After both the sale event and tax payment - should be 50
    expect(await taxService.calculateTaxPosition('2024-02-22T19:00:00Z')).toBe(50);
  });

  test('should apply an amendment to a sale item', async () => {
    
    const saleEvent = {
      eventType: 'SALES' as const,
      date: '2024-02-22T17:29:39Z',
      invoiceId: 'invoice-123',
      items: [{
        itemId: 'item-abc',
        cost: 1000,
        taxRate: 0.2
      }]
    };
    await taxService.addSaleEvent(saleEvent);
    
    const amendment = {
      eventType: 'AMENDMENT' as const,
      date: '2024-02-23T10:00:00Z',
      invoiceId: 'invoice-123',
      itemId: 'item-abc',
      cost: 1500,
      taxRate: 0.2
    };
    await taxService.addAmendment(amendment);
    
    // Before amendment - should use original values (1000 * 0.2 = 200)
    expect(await taxService.calculateTaxPosition('2024-02-22T18:00:00Z')).toBe(200);
    
    // After amendment - should use amended values (1500 * 0.2 = 300)
    expect(await taxService.calculateTaxPosition('2024-02-23T11:00:00Z')).toBe(300);
  });

  test('should apply multiple amendments and use only the most recent one', async () => {
    
    const saleEvent = {
      eventType: 'SALES' as const,
      date: '2024-02-22T17:00:00Z',
      invoiceId: 'invoice-123',
      items: [{
        itemId: 'item-abc',
        cost: 1000,
        taxRate: 0.2
      }]
    };
    await taxService.addSaleEvent(saleEvent);
    
    
    const amendment1 = {
      eventType: 'AMENDMENT' as const,
      date: '2024-02-23T10:00:00Z',
      invoiceId: 'invoice-123',
      itemId: 'item-abc',
      cost: 1500,
      taxRate: 0.2
    };
    await taxService.addAmendment(amendment1);
    
    const amendment2 = {
      eventType: 'AMENDMENT' as const,
      date: '2024-02-24T10:00:00Z',
      invoiceId: 'invoice-123',
      itemId: 'item-abc',
      cost: 2000,
      taxRate: 0.15
    };
    await taxService.addAmendment(amendment2);
    
    // Before any amendments
    expect(await taxService.calculateTaxPosition('2024-02-22T18:00:00Z')).toBe(200); // 1000 * 0.2
    
    // After first amendment
    expect(await taxService.calculateTaxPosition('2024-02-23T11:00:00Z')).toBe(300); // 1500 * 0.2
    
    // After second amendment
    expect(await taxService.calculateTaxPosition('2024-02-24T11:00:00Z')).toBe(300); // 2000 * 0.15
  });

  test('should handle amendments for specific items in multi-item sales', async () => {
    const saleEvent = {
      eventType: 'SALES' as const,
      date: '2024-02-22T17:00:00Z',
      invoiceId: 'invoice-123',
      items: [
        {
          itemId: 'item-1',
          cost: 1000,
          taxRate: 0.2
        },
        {
          itemId: 'item-2',
          cost: 2000,
          taxRate: 0.1
        }
      ]
    };
    await taxService.addSaleEvent(saleEvent);
    
    const amendment = {
      eventType: 'AMENDMENT' as const,
      date: '2024-02-23T10:00:00Z',
      invoiceId: 'invoice-123',
      itemId: 'item-1',
      cost: 1500,
      taxRate: 0.2
    };
    await taxService.addAmendment(amendment);
    
    // Before amendment: (1000 * 0.2) + (2000 * 0.1) = 200 + 200 = 400
    expect(await taxService.calculateTaxPosition('2024-02-22T18:00:00Z')).toBe(400);
    
    // After amendment: (1500 * 0.2) + (2000 * 0.1) = 300 + 200 = 500
    expect(await taxService.calculateTaxPosition('2024-02-23T11:00:00Z')).toBe(500);
  });

  test('should handle multiple sales events with amendments', async () => {
    
    const saleEvent1 = {
      eventType: 'SALES' as const,
      date: '2024-02-22T17:00:00Z',
      invoiceId: 'invoice-1',
      items: [{
        itemId: 'item-1',
        cost: 1000,
        taxRate: 0.2
      }]
    };
    await taxService.addSaleEvent(saleEvent1);
    
    const saleEvent2 = {
      eventType: 'SALES' as const,
      date: '2024-02-23T17:00:00Z',
      invoiceId: 'invoice-2',
      items: [{
        itemId: 'item-2',
        cost: 2000,
        taxRate: 0.1
      }]
    };
    await taxService.addSaleEvent(saleEvent2);
    
    const amendment = {
      eventType: 'AMENDMENT' as const,
      date: '2024-02-24T10:00:00Z',
      invoiceId: 'invoice-1',
      itemId: 'item-1',
      cost: 1500,
      taxRate: 0.2
    };
    await taxService.addAmendment(amendment);
    
    // After first sale: 1000 * 0.2 = 200
    expect(await taxService.calculateTaxPosition('2024-02-22T18:00:00Z')).toBe(200);
    
    // After both sales, before amendment: (1000 * 0.2) + (2000 * 0.1) = 200 + 200 = 400
    expect(await taxService.calculateTaxPosition('2024-02-23T18:00:00Z')).toBe(400);
    
    // After amendment: (1500 * 0.2) + (2000 * 0.1) = 300 + 200 = 500
    expect(await taxService.calculateTaxPosition('2024-02-24T11:00:00Z')).toBe(500);
  });

})