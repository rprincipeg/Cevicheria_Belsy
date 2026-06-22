import { Router } from 'express';
import {
  createOrder,
  getOrder,
  addOrderItems,
  getActiveOrders,
  deliverOrder,
  deliverOrderItem,
} from './Hme-02_visualizar-platos.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

// Must be before /:orderId to avoid route shadowing
router.get('/active', authenticate, authorize('MESERO'), getActiveOrders);

router.post('/', authenticate, authorize('MESERO'), createOrder);
router.get('/:orderId', authenticate, authorize('MESERO'), getOrder);
router.post('/:orderId/items', authenticate, authorize('MESERO'), addOrderItems);
router.patch('/:orderId/deliver', authenticate, authorize('MESERO'), deliverOrder);
router.patch('/:orderId/items/:itemId/deliver', authenticate, authorize('MESERO'), deliverOrderItem);

export default router;

// -EDITADOv2 (added /active and /:orderId/deliver for Hme-03)
