import { Request, Response } from 'express';
import { ingestTransaction, amendSale, getTaxPosition, initTaxController } from './TaxController';
import { DataSource } from 'typeorm';

const mockAddSaleEvent = jest.fn().mockResolvedValue(undefined);
const mockAddTaxPayment = jest.fn().mockResolvedValue(undefined);
const mockAddAmendment = jest.fn().mockResolvedValue(undefined);
const mockCalculateTaxPosition = jest.fn().mockResolvedValue(250);

jest.mock('../service/TaxService', () => {
  return {
    TaxService: jest.fn().mockImplementation(() => ({
      addSaleEvent: mockAddSaleEvent,
      addTaxPayment: mockAddTaxPayment,
      addAmendment: mockAddAmendment,
      calculateTaxPosition: mockCalculateTaxPosition
    }))
  };
});

const mockRequest = () => {
  const req: Partial<Request> = {
    body: {},
    query: {}
  };
  return req as Request;
};

const mockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
  return res as Response;
};

describe('TaxController', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    initTaxController({} as DataSource);
  });

  describe('ingestTransaction', () => {

    test('should successfully process a valid SALES transaction', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      const validSaleEvent = {
        eventType: 'SALES',
        date: '2024-02-22T17:29:39Z',
        invoiceId: 'test-invoice-123',
        items: [{
          itemId: 'test-item-1',
          cost: 1000,
          taxRate: 0.2
        }]
      };
      
      req.body = validSaleEvent;
      
      await ingestTransaction(req, res);
      
      expect(mockAddSaleEvent).toHaveBeenCalledWith(validSaleEvent);
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.send).toHaveBeenCalled();
    });
    
    test('should return 400 for invalid SALES transaction (missing invoiceId)', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      req.body = {
        eventType: 'SALES',
        date: '2024-02-22T17:29:39Z',
        // Missing invoiceId
        items: [{
          itemId: 'test-item-1',
          cost: 1000,
          taxRate: 0.2
        }]
      };
      
      await ingestTransaction(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid transaction format' });
      expect(mockAddSaleEvent).not.toHaveBeenCalled();
    });

    test('should successfully process a valid TAX_PAYMENT transaction', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      const validTaxPayment = {
        eventType: 'TAX_PAYMENT',
        date: '2024-02-22T17:29:39Z',
        amount: 250
      };
      
      req.body = validTaxPayment;
      
      await ingestTransaction(req, res);
      
      expect(mockAddTaxPayment).toHaveBeenCalledWith(validTaxPayment);
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.send).toHaveBeenCalled();
    });
    
    test('should return 400 for invalid TAX_PAYMENT transaction (missing amount)', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      req.body = {
        eventType: 'TAX_PAYMENT',
        date: '2024-02-22T17:29:39Z',
        // Missing amount
      };
      
      await ingestTransaction(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid transaction format' });
      expect(mockAddTaxPayment).not.toHaveBeenCalled();
    });
  });

  describe('amendSale', () => {

    test('should successfully process a valid amendment', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      const validAmendment = {
        eventType: 'AMENDMENT',
        date: '2024-02-23T14:15:30Z',
        invoiceId: 'test-invoice-123',
        itemId: 'test-item-1',
        cost: 1500,
        taxRate: 0.25
      };
      
      req.body = validAmendment;
      
      await amendSale(req, res);
      
      expect(mockAddAmendment).toHaveBeenCalledWith(validAmendment);
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.send).toHaveBeenCalled();
    });
    
    test('should return 400 for invalid amendment (invalid cost type)', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      req.body = {
        eventType: 'AMENDMENT',
        date: '2024-02-23T14:15:30Z',
        invoiceId: 'test-invoice-123',
        itemId: 'test-item-1',
        cost: 'not-a-number', // Should be a number
        taxRate: 0.25
      };
      
      await amendSale(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid amendment format' });
      expect(mockAddAmendment).not.toHaveBeenCalled();
    });
  });
  
  describe('getTaxPosition', () => {

    test('should successfully return tax position for a valid date', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      const validDate = '2024-02-22T17:29:39Z';
      req.query = {
        date: validDate
      };
      
      const expectedTaxPosition = 250;
      
      await getTaxPosition(req, res);
      
      expect(mockCalculateTaxPosition).toHaveBeenCalledWith(validDate);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        date: validDate,
        taxPosition: expectedTaxPosition
      });
    });
    
    test('should return 400 for invalid date parameter', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      req.query = {
        date: 'not-a-date'
      };
      
      await getTaxPosition(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or missing date parameter' });
      expect(mockCalculateTaxPosition).not.toHaveBeenCalled();
    });
  });
});