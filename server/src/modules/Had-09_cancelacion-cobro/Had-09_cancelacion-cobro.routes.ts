import { Router } from 'express';
import {
  forceReleaseTable,
  forceReleaseItem,
  listIncidents,
} from './Had-09_cancelacion-cobro.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

// All incident endpoints require ADMIN (cajero) access
router.post('/tables/:tableId', authenticate, authorize('ADMIN'), forceReleaseTable);
router.post('/items/:orderItemId', authenticate, authorize('ADMIN'), forceReleaseItem);
router.get('/', authenticate, authorize('ADMIN'), listIncidents);

export default router;

// -NUEVOv6
