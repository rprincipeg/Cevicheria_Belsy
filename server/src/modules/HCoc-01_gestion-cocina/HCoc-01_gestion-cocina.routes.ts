import { Router } from 'express';
import { getKitchenOrders, updateItemStatus, updateOrderStatus } from './HCoc-01_gestion-cocina.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

router.get('/orders', authenticate, authorize('COCINERO'), getKitchenOrders);
router.patch('/orders/:orderId/status', authenticate, authorize('COCINERO'), updateOrderStatus);
router.patch(
  '/orders/:orderId/items/:itemId/status',
  authenticate,
  authorize('COCINERO'),
  updateItemStatus,
);

export default router;
