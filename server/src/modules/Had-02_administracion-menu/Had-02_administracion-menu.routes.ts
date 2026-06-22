import { Router } from 'express';
import {
  getCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  setMenuItemStock,
  uploadMenuItemImage,
  deleteMenuItemImage,
} from './Had-02_administracion-menu.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { uploadImage } from '../../shared/middlewares/upload';

const router = Router();

// ─── Mesero: lectura ─────────────────────────────────────────────────────────
router.get('/categories', authenticate, authorize('MESERO'), getCategories);

// ─── Admin: gestión de categorías ────────────────────────────────────────────
router.get('/admin/categories', authenticate, authorize('ADMIN'), getAdminCategories);
router.post('/admin/categories', authenticate, authorize('ADMIN'), createCategory);
router.patch('/admin/categories/:id', authenticate, authorize('ADMIN'), updateCategory);
router.delete('/admin/categories/:id', authenticate, authorize('ADMIN'), deleteCategory);

// ─── Admin: gestión de platos ─────────────────────────────────────────────────
router.post('/admin/items', authenticate, authorize('ADMIN'), createMenuItem);
router.patch('/admin/items/:id', authenticate, authorize('ADMIN'), updateMenuItem);
router.delete('/admin/items/:id', authenticate, authorize('ADMIN'), deleteMenuItem);
router.patch('/admin/items/:id/stock', authenticate, authorize('ADMIN'), setMenuItemStock);

// ─── Admin: imagen de plato ───────────────────────────────────────────────────
router.patch(
  '/admin/items/:id/image',
  authenticate,
  authorize('ADMIN'),
  uploadImage,
  uploadMenuItemImage,
);
router.delete('/admin/items/:id/image', authenticate, authorize('ADMIN'), deleteMenuItemImage);

export default router;

// -EDITADOv2 -EDITADOv5 (added recipe routes for Had-06)
