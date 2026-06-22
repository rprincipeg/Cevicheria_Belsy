import { Router } from 'express';
import { listUsers, createUser, updateUser, setUserStatus } from './Had-03_gestion-usuarios.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

// All user-management routes are ADMIN-only
router.get('/', authenticate, authorize('ADMIN'), listUsers);
router.post('/', authenticate, authorize('ADMIN'), createUser);
router.patch('/:id', authenticate, authorize('ADMIN'), updateUser);
router.patch('/:id/status', authenticate, authorize('ADMIN'), setUserStatus);

export default router;

// -NUEVOv3
