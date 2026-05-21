import { Router } from 'express';
import { getTables } from '../controllers/tables.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';

const router = Router();

router.get('/', authenticate, authorize('MESERO'), getTables);

export default router;
