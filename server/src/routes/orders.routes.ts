import { Router } from 'express';
import { createOrder, getOrder, addOrderItems } from '../controllers/orders.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';

const router = Router();

router.post('/', authenticate, authorize('MESERO'), createOrder);
router.get('/:orderId', authenticate, authorize('MESERO'), getOrder);
router.post('/:orderId/items', authenticate, authorize('MESERO'), addOrderItems);

export default router;
