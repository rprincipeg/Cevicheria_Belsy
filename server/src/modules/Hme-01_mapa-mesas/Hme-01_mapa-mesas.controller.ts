import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { getIo } from '../../shared/services/socket.service';

async function fetchTablesWithActiveOrder() {
  const tables = await prisma.diningTable.findMany({
    orderBy: { number: 'asc' },
    select: {
      id: true,
      number: true,
      status: true,
      mergedIntoId: true,
      mergedInto: { select: { number: true } },
      mergedSources: { select: { id: true, number: true }, orderBy: { number: 'asc' } },
      orders: {
        where: { OR: [{ status: 'PENDING' }, { status: 'IN_PROGRESS' }, { status: 'READY' }, { status: 'DELIVERED' }] },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true },
      },
    },
  });
  return tables.map((t) => {
    // Pedido activo "editable" (para añadir ítems): PENDING/IN_PROGRESS/READY.
    const activeOrder = t.orders.find((o) => o.status !== 'DELIVERED');
    return {
      id: t.id,
      number: t.number,
      status: t.status,
      mergedIntoId: t.mergedIntoId ?? null,
      mergedIntoNumber: t.mergedInto?.number ?? null,
      mergedSourceNumbers: t.mergedSources.map((s) => s.number), // Hme-04: mesas fusionadas en esta
      mergedSources: t.mergedSources.map((s) => ({ id: s.id, number: s.number })), // Hme-04: para separar
      // Hay pedidos en la cuenta (incluye entregados sin cobrar). Si no hay, la fusión se puede separar.
      hasActiveOrders: t.orders.length > 0,
      activeOrderId: activeOrder?.id ?? null,
    };
  });
}

export async function broadcastTablesUpdate(): Promise<void> {
  const tables = await fetchTablesWithActiveOrder();
  getIo().emit('tables:updated', [...tables, { id: 'takeaway', type: 'takeaway' }]);
}

export async function getTables(_req: Request, res: Response): Promise<void> {
  try {
    const tables = await fetchTablesWithActiveOrder();
    res.json([...tables, { id: 'takeaway', type: 'takeaway' }]);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── Hme-04: Modificar mesas ──────────────────────────────────────────────────

const MOVABLE_STATUSES = ['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED'] as const;

const moveTableSchema = z.object({
  targetTableId: z.number().int().positive('El ID de mesa destino debe ser positivo'),
});

// ─── PATCH /api/tables/:tableId/move ─────────────────────────────────────────
// Hme-04: Mueve todos los pedidos activos de la mesa origen a la mesa destino.
// Sirve tanto para "mover pedido" (mesa equivocada) como "juntar mesas" (target ya tiene pedidos).
export async function moveTable(req: Request, res: Response): Promise<void> {
  try {
    const sourceId = parseInt(req.params['tableId'] as string, 10);
    if (isNaN(sourceId)) {
      res.status(400).json({ error: 'ID de mesa origen inválido' });
      return;
    }

    const parsed = moveTableSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { targetTableId } = parsed.data;

    if (sourceId === targetTableId) {
      res.status(400).json({ error: 'La mesa origen y destino deben ser diferentes' });
      return;
    }

    const [source, target] = await Promise.all([
      prisma.diningTable.findUnique({
        where: { id: sourceId },
        include: { mergedSources: { select: { id: true } } },
      }),
      prisma.diningTable.findUnique({ where: { id: targetTableId } }),
    ]);

    if (!source) { res.status(404).json({ error: 'Mesa origen no encontrada' }); return; }
    if (!target) { res.status(404).json({ error: 'Mesa destino no encontrada' }); return; }

    // No se puede fusionar dentro de una mesa que ya está fusionada en otra
    if (target.status === 'MERGED') {
      res.status(400).json({ error: 'La mesa destino ya está fusionada con otra mesa' });
      return;
    }

    // Si la mesa origen ya es una fusión (ancla con mesas fusionadas), todo el
    // grupo debe moverse junto a la mesa destino. Si no se re-apuntan, esas mesas
    // quedan colgando de la vieja ancla (que ahora es MERGED) y desaparecen del
    // mapa porque las MERGED no se dibujan. -EDITADOv7
    const sourceMergedIds = source.mergedSources.map((s) => s.id);
    const groupTableIds = [sourceId, ...sourceMergedIds];

    // Se fusiona cualquier mesa (libre u ocupada). Si la origen tiene pedidos
    // activos se reasignan a la mesa destino; si está libre, solo se fusiona.
    const activeOrders = await prisma.order.findMany({
      where: { tableId: { in: groupTableIds }, status: { in: [...MOVABLE_STATUSES] } },
      select: { id: true },
    });

    const orderIds = activeOrders.map((o) => o.id);

    await prisma.$transaction([
      prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data:  { tableId: targetTableId },
      }),
      // Source stays MERGED (blocked) until the target table is fully paid and released
      prisma.diningTable.update({
        where: { id: sourceId },
        data:  { status: 'MERGED', mergedIntoId: targetTableId },
      }),
      // Re-apunta las mesas que ya estaban fusionadas en la origen para que el
      // grupo entero quede bajo la nueva mesa destino (evita que se "borren").
      prisma.diningTable.updateMany({
        where: { id: { in: sourceMergedIds } },
        data:  { status: 'MERGED', mergedIntoId: targetTableId },
      }),
      prisma.diningTable.update({
        where: { id: targetTableId },
        data:  { status: 'OCCUPIED' },
      }),
    ]);

    await broadcastTablesUpdate();

    // Notify kitchen: ítems reasignados pueden mostrarse con el nuevo número de mesa
    getIo().emit('orders:table_moved', {
      fromTableNumber: source.number,
      toTableNumber:   target.number,
      orderIds,
    });

    res.json({
      message:        `Mesa ${source.number} fusionada con Mesa ${target.number}`,
      fromTable:      { id: source.id, number: source.number, newStatus: 'MERGED' },
      toTable:        { id: target.id, number: target.number, newStatus: 'OCCUPIED' },
      movedOrderCount: orderIds.length,
    });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv4

// ─── PATCH /api/tables/:tableId/unmerge ──────────────────────────────────────
// Hme-04: Separa una mesa fusionada (origen) y la devuelve a LIBRE. La cuenta
// combinada permanece en la mesa destino. Si la mesa destino queda sin pedidos
// activos ni más mesas fusionadas, también se libera.
export async function unmergeTable(req: Request, res: Response): Promise<void> {
  try {
    const sourceId = parseInt(req.params['tableId'] as string, 10);
    if (isNaN(sourceId)) {
      res.status(400).json({ error: 'ID de mesa inválido' });
      return;
    }

    const source = await prisma.diningTable.findUnique({ where: { id: sourceId } });
    if (!source) { res.status(404).json({ error: 'Mesa no encontrada' }); return; }
    if (source.status !== 'MERGED' || source.mergedIntoId == null) {
      res.status(400).json({ error: 'La mesa no está fusionada' });
      return;
    }

    const targetId = source.mergedIntoId;

    // Solo se puede separar una fusión SIN pedidos. Si la mesa destino tiene
    // pedidos activos, la cuenta está combinada y ya no se puede separar.
    const activeOrderCount = await prisma.order.count({
      where: { tableId: targetId, status: { in: [...MOVABLE_STATUSES] } },
    });
    if (activeOrderCount > 0) {
      res.status(400).json({ error: 'No se puede separar una mesa fusionada que ya tiene pedidos' });
      return;
    }

    await prisma.diningTable.update({
      where: { id: sourceId },
      data:  { status: 'FREE', mergedIntoId: null },
    });

    // Si la mesa destino ya no tiene más mesas fusionadas, también se libera
    // (la fusión sin pedidos era solo una agrupación de mesas).
    const remainingSources = await prisma.diningTable.count({ where: { mergedIntoId: targetId } });
    if (remainingSources === 0) {
      await prisma.diningTable.update({ where: { id: targetId }, data: { status: 'FREE' } });
    }

    await broadcastTablesUpdate();
    // La etiqueta de mesa en cocina ("1 + 2") cambia: refrescar la vista de cocina
    getIo().to('kitchen').emit('orders:updated');

    res.json({
      message: `Mesa ${source.number} separada de la fusión`,
      freedTableId: source.id,
      freedTableNumber: source.number,
    });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── PATCH /api/tables/:tableId/relocate ─────────────────────────────────────
// Hme-04: Mueve el pedido de una mesa OCUPADA a una mesa LIBRE y libera la mesa
// de origen. A diferencia de fusionar, la mesa de origen queda LIBRE (no bloqueada).
export async function relocateOrders(req: Request, res: Response): Promise<void> {
  try {
    const sourceId = parseInt(req.params['tableId'] as string, 10);
    if (isNaN(sourceId)) {
      res.status(400).json({ error: 'ID de mesa de origen inválido' });
      return;
    }

    const parsed = moveTableSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { targetTableId } = parsed.data;

    if (sourceId === targetTableId) {
      res.status(400).json({ error: 'La mesa de origen y destino deben ser diferentes' });
      return;
    }

    const [source, target] = await Promise.all([
      prisma.diningTable.findUnique({
        where: { id: sourceId },
        include: { mergedSources: { select: { id: true } } },
      }),
      prisma.diningTable.findUnique({ where: { id: targetTableId } }),
    ]);

    if (!source) { res.status(404).json({ error: 'Mesa de origen no encontrada' }); return; }
    if (!target) { res.status(404).json({ error: 'Mesa de destino no encontrada' }); return; }

    if (source.status !== 'OCCUPIED') {
      res.status(400).json({ error: 'La mesa de origen debe estar ocupada' });
      return;
    }
    if (target.status !== 'FREE') {
      res.status(400).json({ error: 'La mesa de destino debe estar libre' });
      return;
    }

    const activeOrders = await prisma.order.findMany({
      where: { tableId: sourceId, status: { in: [...MOVABLE_STATUSES] } },
      select: { id: true },
    });
    if (activeOrders.length === 0) {
      res.status(400).json({ error: 'La mesa de origen no tiene pedidos para mover' });
      return;
    }
    const orderIds = activeOrders.map((o) => o.id);
    // Si la mesa de origen es una fusión, también se liberan sus mesas fusionadas.
    const sourceMergedIds = source.mergedSources.map((s) => s.id);

    await prisma.$transaction([
      prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data:  { tableId: targetTableId },
      }),
      // La mesa de origen (y, si es fusión, sus mesas fusionadas) se liberan por completo
      prisma.diningTable.updateMany({
        where: { id: { in: [sourceId, ...sourceMergedIds] } },
        data:  { status: 'FREE', mergedIntoId: null },
      }),
      prisma.diningTable.update({
        where: { id: targetTableId },
        data:  { status: 'OCCUPIED' },
      }),
    ]);

    await broadcastTablesUpdate();
    getIo().emit('orders:table_moved', {
      fromTableNumber: source.number,
      toTableNumber:   target.number,
      orderIds,
    });
    getIo().to('kitchen').emit('orders:updated');

    res.json({
      message:         `Pedido movido de Mesa ${source.number} a Mesa ${target.number}`,
      fromTable:       { id: source.id, number: source.number, newStatus: 'FREE' },
      toTable:         { id: target.id, number: target.number, newStatus: 'OCCUPIED' },
      movedOrderCount: orderIds.length,
    });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── GET /api/tables/:tableId/active-items ────────────────────────────────────
// Returns all active order items for a table (across all merged orders).
// Used by Hme-02 to display the combined existing-items sidebar after a merge.
const ACTIVE_ORDER_STATUSES = ['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED'] as const;

export async function getTableActiveItems(req: Request, res: Response): Promise<void> {
  try {
    const tableId = parseInt(req.params['tableId'] as string, 10);
    if (isNaN(tableId)) {
      res.status(400).json({ error: 'ID de mesa inválido' });
      return;
    }
    const orders = await prisma.order.findMany({
      where: { tableId, status: { in: [...ACTIVE_ORDER_STATUSES] } },
      include: {
        items: {
          where: { paidAt: null },
          include: { menuItem: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const items = orders.flatMap((o) =>
      o.items.map((item) => ({
        id: item.id,
        menuItem: { name: item.menuItem.name },
        quantity: item.quantity,
        status: item.status,
      })),
    );
    res.json({ items });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
