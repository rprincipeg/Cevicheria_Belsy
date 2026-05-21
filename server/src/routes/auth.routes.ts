import { Router } from 'express';
import { login, logout } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.post('/login', login);
router.post('/logout', authenticate, logout);

export default router;
