import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { SaleEvent, TaxPaymentEvent, Amendment as AmendmentType } from "../utils/types";
import { TaxService } from "../service/TaxService";
import logger from "../utils/logger";
import { isValidAmendment, isValidDate, isValidTransaction } from "../utils/validation";

let taxService: TaxService;

export function initTaxController(dataSource: DataSource): void {
  taxService = new TaxService(dataSource, logger);
}

export async function ingestTransaction(req: Request, res: Response): Promise<void> {
  try {
    const transaction = req.body;
    
    if (!isValidTransaction(transaction)) {
      logger.error({ msg: 'Invalid transaction format', transaction });
      res.status(400).json({ error: 'Invalid transaction format' });
      return;
    }
    
    logger.info({ msg: 'Ingesting transaction', eventType: transaction.eventType, date: transaction.date });
    
    if (transaction.eventType === 'SALES') {
      await taxService.addSaleEvent(transaction as SaleEvent);
    } else if (transaction.eventType === 'TAX_PAYMENT') {
      await taxService.addTaxPayment(transaction as TaxPaymentEvent);
    }
    
    res.status(202).send();
  } catch (error) {
    logger.error({ msg: 'Error processing transaction', error });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function amendSale(req: Request, res: Response): Promise<void> {
  try {
    const amendment = req.body as AmendmentType;
    
    if (!isValidAmendment(amendment)) {
      logger.error({ msg:'Invalid amendment format', amendment });
      res.status(400).json({ error: 'Invalid amendment format' });
      return;
    }
    
    logger.info({
      msg: 'Processing amendment',
      invoiceId: amendment.invoiceId, 
      itemId: amendment.itemId,
      date: amendment.date
    });
    
    await taxService.addAmendment(amendment);
    
    res.status(202).send();
  } catch (error) {
    logger.error({ msg: 'Error processing amendment', error });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTaxPosition(req: Request, res: Response): Promise<any> {
  try {
    const dateParam = req.query.date as string;
    
    if (!dateParam || !isValidDate(dateParam)) {
      logger.error({ msg:'Invalid or missing date parameter', date: dateParam });
      return res.status(400).json({ error: 'Invalid or missing date parameter' });
    }
    
    logger.info({ msg: 'Querying tax position', date: dateParam });
    
    const taxPosition = await taxService.calculateTaxPosition(dateParam);
    
    return res.status(200).json({
      date: dateParam,
      taxPosition
    });
  } catch (error) {
    logger.error({ msg: 'Error calculating tax position', error });
    return res.status(500).json({ error: 'Internal server error' });
  }
}