import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { broadcastTablesUpdate } from '../Hme-01_mapa-mesas/Hme-01_mapa-mesas.controller';
import { getIo } from '../../shared/services/socket.service';

// Statuses that represent an active (unpaid, non-cancelled) order
const ACTIVE_STATUSES = ['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED'] as const;

const releaseSchema = z.object({
  reason: z.string().optional(),
});

// ─── POST /api/incidents/tables/:tableId ──────────────────────────────────────
// Had-09 Criterion 1,3,4,5: libera una mesa completa sin cobrar, registra como pérdida.
// La confirmación (criterio 5) ocurre en el frontend antes de llamar este endpoint.
export async function forceReleaseTable(req: Request, res: Response): Promise<void> {
  try {
    const tableId = parseInt(req.params['tableId'] as string, 10);
    if (isNaN(tableId)) { res.status(400).json({ error: 'ID de mesa inválido' }); return; }

    const parsed = releaseSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const { reason } = parsed.data;

    const table = await prisma.diningTable.findUnique({ where: { id: tableId } });
    if (!table) { res.status(404).json({ error: 'Mesa no encontrada' }); return; }

    // Fetch all active orders with their items
    const activeOrders = await prisma.order.findMany({
      where: { tableId, status: { in: [...ACTIVE_STATUSES] } },
      include: {
        items: {
          include: { menuItem: { select: { name: true } } },
        },
      },
    });

    if (activeOrders.length === 0) {
      res.status(400).json({ error: 'La mesa no tiene pedidos activos para liberar' });
      return;
    }

    // Compute total loss and build item snapshot
    const lostAmount = activeOrders.reduce((s, o) => s + Number(o.total), 0);
    const itemsSnapshot = activeOrders.flatMap((o) =>
      o.items
        .filter((i) => i.status !== 'CANCELLED' as any)
        .map((i) => ({
          orderCode: o.code,
          name: i.menuItem.name,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          subtotal: Number(i.subtotal),
        })),
    );

    const orderIds = activeOrders.map((o) => o.id);
    const itemIds = activeOrders.flatMap((o) => o.items.map((i) => i.id));

    // Atomic transaction: create incident + cancel everything + free table
    const incident = await prisma.$transaction(async (tx) => {
      const created = await (tx as any).incident.create({
        data: {
          tableId,
          tableNumber: table.number,
          lostAmount,
          reason: reason ?? null,
          itemsSnapshot,
          releasedById: req.user!.userId,
        },
      });

      await tx.orderItem.updateMany({
        where: { id: { in: itemIds } },
        data: { status: 'CANCELLED' as any },
      });

      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: { status: 'CANCELLED' as any },
      });

      await tx.diningTable.update({
        where: { id: tableId },
        data: { status: 'FREE' },
      });

      return created;
    });

    // Broadcast table state change (Criterion 3: real-time status update)
    await broadcastTablesUpdate();
    getIo().emit('incident:table_released', {
      incidentId:  incident.id,
      tableId,
      tableNumber: table.number,
      lostAmount,
      releasedAt:  incident.createdAt,
    });

    res.status(201).json({
      incident: {
        id:          incident.id,
        tableNumber: table.number,
        lostAmount,
        reason:      reason ?? null,
        createdAt:   incident.createdAt,
      },
      releasedOrderCount: orderIds.length,
    });
  } catch (err) {
    console.error('[incident-controller] forceReleaseTable:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv6

// ─── POST /api/incidents/items/:orderItemId ────────────────────────────────────
// Had-09 Criterion 2,3,4,5: libera (cancela) un ítem específico sin cobrar.
// Si todos los ítems de la mesa quedan cancelados, la mesa se libera también.
export async function forceReleaseItem(req: Request, res: Response): Promise<void> {
  try {
    const orderItemId = req.params['orderItemId'] as string;

    const parsed = releaseSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const { reason } = parsed.data;

    // Load item + parent order + table info
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        menuItem: { select: { name: true } },
        order: {
          include: {
            table: { select: { id: true, number: true } },
            items: { select: { id: true, status: true, subtotal: true } },
          },
        },
      },
    });

    if (!orderItem) { res.status(404).json({ error: 'Ítem no encontrado' }); return; }
    if ((orderItem.status as string) === 'CANCELLED') {
      res.status(400).json({ error: 'El ítem ya está cancelado' });
      return;
    }
    if ((orderItem.order.status as string) === 'PAID' || (orderItem.order.status as string) === 'CANCELLED') {
      res.status(400).json({ error: 'El pedido de este ítem ya fue cobrado o cancelado' });
      return;
    }

    const lostAmount = Number(orderItem.subtotal);
    const tableId     = orderItem.order.tableId ?? null;
    const tableNumber = orderItem.order.table?.number ?? null;
    const orderId     = orderItem.orderId;

    // tableWillBeFreed and newOrderTotal are determined INSIDE the transaction
    // to avoid a TOCTOU race where concurrent item cancellations leave the table
    // permanently OCCUPIED with all orders CANCELLED and no recovery path.
    let tableActuallyFreed = false;

    const incident = await prisma.$transaction(async (tx) => {
      const created = await (tx as any).incident.create({
        data: {
          tableId,
          tableNumber,
          orderId,
          orderItemId,
          lostAmount,
          reason: reason ?? null,
          itemsSnapshot: [
            {
              orderCode:  orderItem.order.code,
              name:       orderItem.menuItem.name,
              quantity:   orderItem.quantity,
              unitPrice:  Number(orderItem.unitPrice),
              subtotal:   lostAmount,
            },
          ],
          releasedById: req.user!.userId,
        },
      });

      // Mark this item as CANCELLED
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { status: 'CANCELLED' as any },
      });

      // Recalculate order total from the live DB state inside the transaction
      const survivingItems = await tx.orderItem.findMany({
        where: { orderId, status: { not: 'CANCELLED' as any } },
        select: { subtotal: true },
      });
      const freshOrderTotal = survivingItems.reduce((s, i) => s + Number(i.subtotal), 0);
      await tx.order.update({ where: { id: orderId }, data: { total: freshOrderTotal } });

      // Re-read all active items for this table inside the transaction.
      // This is the authoritative check: if 0 items remain, free the table atomically.
      if (tableId !== null) {
        const activeItemCount = await tx.orderItem.count({
          where: {
            order: { tableId, status: { in: [...ACTIVE_STATUSES] } },
            status: { not: 'CANCELLED' as any },
          },
        });

        if (activeItemCount === 0) {
          await tx.order.updateMany({
            where: { tableId, status: { in: [...ACTIVE_STATUSES] } },
            data: { status: 'CANCELLED' as any },
          });
          await tx.diningTable.update({
            where: { id: tableId },
            data: { status: 'FREE' },
          });
          tableActuallyFreed = true;
        }
      }

      return { incident: created, freshOrderTotal };
    });

    if (tableActuallyFreed) {
      await broadcastTablesUpdate();
    }

    getIo().emit('incident:item_released', {
      incidentId:   incident.incident.id,
      tableNumber,
      orderItemId,
      itemName:     orderItem.menuItem.name,
      lostAmount,
      tableFreed:   tableActuallyFreed,
      releasedAt:   incident.incident.createdAt,
    });

    res.status(201).json({
      incident: {
        id:          incident.incident.id,
        tableNumber,
        itemName:    orderItem.menuItem.name,
        lostAmount,
        reason:      reason ?? null,
        createdAt:   incident.incident.createdAt,
      },
      newOrderTotal: incident.freshOrderTotal,
      tableFreed: tableActuallyFreed,
    });
  } catch (err) {
    console.error('[incident-controller] forceReleaseItem:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv6

// ─── GET /api/incidents ────────────────────────────────────────────────────────
// Had-09 Criterion 4: historial de pérdidas registradas.
// Query params opcionales: startDate=YYYY-MM-DD, endDate=YYYY-MM-DD
export async function listIncidents(req: Request, res: Response): Promise<void> {
  try {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const rawStart = req.query['startDate'];
    const rawEnd   = req.query['endDate'];

    const where: Record<string, unknown> = {};

    if (typeof rawStart === 'string' && dateRegex.test(rawStart) &&
        typeof rawEnd   === 'string' && dateRegex.test(rawEnd)) {
      const [sy, sm, sd] = rawStart.split('-').map(Number);
      const [ey, em, ed] = rawEnd.split('-').map(Number);
      where['createdAt'] = {
        gte: new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0)),
        lte: new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999)),
      };
    }

    const incidents = await (prisma as any).incident.findMany({
      where,
      include: {
        table:       { select: { number: true } },
        releasedBy:  { select: { username: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalLost = incidents.reduce((s: number, i: { lostAmount: unknown }) => s + Number(i.lostAmount), 0);

    res.json({
      totalLost,
      totalIncidents: incidents.length,
      incidents: incidents.map((i: {
        id: string; tableNumber: number | null; orderId: string | null;
        orderItemId: string | null; lostAmount: unknown; reason: string | null;
        itemsSnapshot: unknown; releasedBy: { username: string; fullName: string | null };
        createdAt: Date;
      }) => ({
        id:           i.id,
        tableNumber:  i.tableNumber,
        orderId:      i.orderId,
        orderItemId:  i.orderItemId,
        lostAmount:   Number(i.lostAmount),
        reason:       i.reason,
        itemsSnapshot: i.itemsSnapshot,
        releasedBy:   i.releasedBy.fullName ?? i.releasedBy.username,
        createdAt:    i.createdAt,
      })),
    });
  } catch (err) {
    console.error('[incident-controller] listIncidents:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv6
