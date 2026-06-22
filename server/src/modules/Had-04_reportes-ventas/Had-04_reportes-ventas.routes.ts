import { Router } from 'express';
import {
  getDailyReport,
  exportDailyReport,
  createDailyClosure,
  listClosures,
  downloadClosureExcel,
  getPaymentHistory,
  exportPaymentHistory,
  getDashboard,
  getWeeklySales,
  getMonthlySales,
} from './Had-04_reportes-ventas.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

// All report routes are ADMIN-only
// Must declare specific sub-paths before generic ones to avoid route shadowing
router.get('/daily/export', authenticate, authorize('ADMIN'), exportDailyReport);
router.post('/daily/close', authenticate, authorize('ADMIN'), createDailyClosure);
router.get('/daily', authenticate, authorize('ADMIN'), getDailyReport);
router.get('/closures/:id/export', authenticate, authorize('ADMIN'), downloadClosureExcel);
router.get('/closures', authenticate, authorize('ADMIN'), listClosures);

// Had-07 — Historial de pagos por rango de fechas
router.get('/payments/export', authenticate, authorize('ADMIN'), exportPaymentHistory); // -NUEVOv4
router.get('/payments', authenticate, authorize('ADMIN'), getPaymentHistory);           // -NUEVOv4

// Had-08 — Gráficas de ventas y estadísticas
router.get('/dashboard', authenticate, authorize('ADMIN'), getDashboard);   // -NUEVOv6
router.get('/weekly', authenticate, authorize('ADMIN'), getWeeklySales);    // -NUEVOv6
router.get('/monthly', authenticate, authorize('ADMIN'), getMonthlySales);  // -NUEVOv6

export default router;

// -NUEVOv3 -EDITADOv4 -EDITADOv6
