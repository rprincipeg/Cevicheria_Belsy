// Had-05 & Had-06 — Rutas de almacén, insumos y recetas
// Módulo removible junto con inventory.controller.ts

import { Router } from 'express';
import {
  getSupplyCategories,
  createSupplyCategory,
  updateSupplyCategory,
  deleteSupplyCategory,
  getSupplies,
  createSupply,
  updateSupply,
  deleteSupply,
  registerStock,
} from './Had-05_control-almacen.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

// ─── Categorías de insumos ───────────────────────────────────────────────────
router.get('/categories', authenticate, authorize('ADMIN'), getSupplyCategories);
router.post('/categories', authenticate, authorize('ADMIN'), createSupplyCategory);
router.patch('/categories/:id', authenticate, authorize('ADMIN'), updateSupplyCategory);
router.delete('/categories/:id', authenticate, authorize('ADMIN'), deleteSupplyCategory);

// ─── Insumos ─────────────────────────────────────────────────────────────────
router.get('/supplies', authenticate, authorize('ADMIN'), getSupplies);
router.post('/supplies', authenticate, authorize('ADMIN'), createSupply);
router.patch('/supplies/:id', authenticate, authorize('ADMIN'), updateSupply);
router.delete('/supplies/:id', authenticate, authorize('ADMIN'), deleteSupply);
router.patch('/supplies/:id/stock', authenticate, authorize('ADMIN'), registerStock);

export default router;

// -NUEVOv5
