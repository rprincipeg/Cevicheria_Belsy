import { Router } from 'express';
import { createOrder, addOrderItems } from '../controllers/orders.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';

const router = Router();

router.post('/', authenticate, authorize('MESERO'), createOrder);
router.post('/:orderId/items', authenticate, authorize('MESERO'), addOrderItems);

export default router;
