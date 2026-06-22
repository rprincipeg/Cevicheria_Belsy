import { Router } from 'express';
import { getTables, moveTable, unmergeTable, relocateOrders, getTableActiveItems } from './Hme-01_mapa-mesas.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

router.get('/', authenticate, authorize('MESERO'), getTables);
router.get('/:tableId/active-items', authenticate, authorize('MESERO'), getTableActiveItems);

// Hme-04 — Modificar mesas: mover todos los pedidos activos a otra mesa
router.patch('/:tableId/move', authenticate, authorize('MESERO'), moveTable); // -NUEVOv4

// Hme-04 — Separar una mesa fusionada y devolverla a LIBRE
router.patch('/:tableId/unmerge', authenticate, authorize('MESERO'), unmergeTable);

// Hme-04 — Mover el pedido de una mesa ocupada a una mesa libre (libera el origen)
router.patch('/:tableId/relocate', authenticate, authorize('MESERO'), relocateOrders);

export default router; // -EDITADOv4
