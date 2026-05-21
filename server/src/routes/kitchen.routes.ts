import { Router } from 'express';
import { getKitchenOrders, updateItemStatus } from '../controllers/kitchen.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';

const router = Router();

router.get('/orders', authenticate, authorize('COCINERO'), getKitchenOrders);
router.patch(
  '/orders/:orderId/items/:itemId/status',
  authenticate,
  authorize('COCINERO'),
  updateItemStatus,
);

export default router;
