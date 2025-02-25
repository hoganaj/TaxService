import { Express, Request, Response } from "express";
import { DataSource } from "typeorm";
import { SaleEvent, TaxPaymentEvent } from "./types";
import { TaxService } from "./TaxService";
import logger from "./logger";
import { isValidTransaction } from "./validation";

export function registerRoutes(app: Express, AppDataSource: DataSource) {

  const taxService = new TaxService(AppDataSource, logger);

  app.post('/transactions', async (req: Request, res: Response): Promise<void>  => {
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

}