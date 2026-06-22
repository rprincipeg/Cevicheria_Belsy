import { Router } from 'express';
import { login, logout } from './US-01_acceso-por-rol.controller';
import { authenticate } from '../../shared/middlewares/authenticate';

const router = Router();

router.post('/login', login);
router.post('/logout', authenticate, logout);

export default router;
