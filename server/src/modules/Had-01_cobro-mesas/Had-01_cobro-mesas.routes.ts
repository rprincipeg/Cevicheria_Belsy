import { Router } from 'express';
import {
  getPaymentTablesSummary,
  downloadReceipt,
  getTableBill,
  getTakeawayBill,
  getTakeawayOrderBill,
  processTablePayment,
  processTakeawayPayment,
  processTakeawayOrderPayment,
  releaseTable,
} from './Had-01_cobro-mesas.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

// Cajero/Admin access only (authorize middleware already grants ADMIN universal access)
router.get('/summary', authenticate, authorize('ADMIN'), getPaymentTablesSummary);
router.get('/receipt/:paymentId', authenticate, authorize('ADMIN'), downloadReceipt);
router.get('/takeaway/bill', authenticate, authorize('ADMIN'), getTakeawayBill);
router.get('/takeaway/:orderId/bill', authenticate, authorize('ADMIN'), getTakeawayOrderBill);
router.get('/tables/:tableId/bill', authenticate, authorize('ADMIN'), getTableBill);
router.post('/tables/:tableId', authenticate, authorize('ADMIN'), processTablePayment);
router.patch('/tables/:tableId/release', authenticate, authorize('ADMIN'), releaseTable);
router.post('/takeaway', authenticate, authorize('ADMIN'), processTakeawayPayment);
router.post('/takeaway/:orderId', authenticate, authorize('ADMIN'), processTakeawayOrderPayment);

export default router;
