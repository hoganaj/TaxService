import { Express, Request, Response } from "express";
import { DataSource } from "typeorm";
import { SaleEvent, TaxPaymentEvent, Amendment as AmendmentType } from "./types";
import { TaxService } from "./TaxService";
import logger from "./logger";
import { isValidAmendment, isValidDate, isValidTransaction } from "./validation";

export function registerRoutes(app: Express, AppDataSource: DataSource) {

  const taxService = new TaxService(AppDataSource, logger);

  app.post('/transactions', async (req: Request, res: Response): Promise<void> => {
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
  });

  app.patch('/sale', async (req: Request, res: Response): Promise<void> => {
    try {
      const amendment = req.body as AmendmentType;
      
      if (!isValidAmendment(amendment)) {
        logger.error({ msg:'Invalid amendment format', amendment });
        res.status(400).json({ error: 'Invalid amendment format' });
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
  });

  app.get('/tax-position', async (req: Request, res: Response): Promise<any> => {
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
  });

}