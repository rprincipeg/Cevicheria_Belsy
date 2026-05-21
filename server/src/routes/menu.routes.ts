import { Router } from 'express';
import { getCategories } from '../controllers/menu.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';

const router = Router();

router.get('/categories', authenticate, authorize('MESERO'), getCategories);

export default router;
