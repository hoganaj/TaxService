import { Router } from 'express';
import { ingestTransaction, getTaxPosition, amendSale } from '../controllers/TaxController';

const router = Router();

router.post('/transactions', ingestTransaction);
router.get('/tax-position', getTaxPosition);
router.patch('/sale', amendSale);

export default router;