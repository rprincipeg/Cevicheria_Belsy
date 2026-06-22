import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { getIo } from '../../shared/services/socket.service';
import { tableLabelSelect, formatTableLabel } from '../../shared/utils/table-label';

const updateItemStatusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'READY']),
});

export async function getKitchenOrders(_req: Request, res: Response): Promise<void> {
  try {
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          { status: 'IN_PROGRESS' },
          { status: 'READY' },
        ],
      },
      include: {
        table: { select: tableLabelSelect },
        items: {
          where: {
            menuItem: { isPreparable: true },  // drinks are excluded from kitchen
            // Los ítems listos permanecen en cocina hasta que el mesero los
            // entregue (status DELIVERED) — ya no desaparecen a los 5 minutos.
            status: { in: ['PENDING', 'IN_PROGRESS', 'READY'] },
          },
          orderBy: { createdAt: 'asc' },
          include: { menuItem: { select: { name: true, isPreparable: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const result = orders
      .filter((order) => order.items.length > 0)
      .map((order) => ({
        id: order.id,
        code: order.code,
        status: order.status,
        isTakeaway: order.isTakeaway,
        notes: order.notes,
        tableNumber: order.table?.number ?? null,
        tableLabel: formatTableLabel(order.table),
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          status: item.status,
          isTakeaway: item.isTakeaway,
          readyAt: item.readyAt,
          createdAt: item.createdAt,
        })),
      }));

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateItemStatus(req: Request, res: Response): Promise<void> {
  try {
    const orderId = req.params['orderId'] as string;
    const itemId = req.params['itemId'] as string;

    const result = updateItemStatusSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const { status } = result.data;

    const item = await prisma.orderItem.findFirst({
      where: { id: itemId, orderId: orderId },
    });
    if (!item) {
      res.status(404).json({ error: 'Ítem no encontrado' });
      return;
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status,
        readyAt: status === 'READY' ? new Date() : undefined,
      },
    });

    if (status === 'IN_PROGRESS') {
      await prisma.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'IN_PROGRESS' },
      });
    }

    if (status === 'READY') {
      // Notificar al mesero por cada ítem individual marcado como listo
      const itemInfo = await prisma.orderItem.findUnique({
        where: { id: itemId },
        include: { menuItem: { select: { name: true } } },
      });
      const orderInfo = await prisma.order.findUnique({
        where: { id: orderId },
        select: { isTakeaway: true, table: { select: tableLabelSelect } },
      });
      if (itemInfo && orderInfo) {
        getIo().to('waiters').emit('orders:itemReady', {
          orderId,
          itemId,
          tableNumber: orderInfo.table?.number ?? null,
          tableLabel: formatTableLabel(orderInfo.table),
          isTakeaway: itemInfo.isTakeaway || orderInfo.isTakeaway,
          itemName: itemInfo.menuItem.name,
          quantity: itemInfo.quantity,
        });
      }

      // Only consider preparable items (drinks are excluded from kitchen logic)
      const allItems = await prisma.orderItem.findMany({
        where: { orderId, menuItem: { isPreparable: true } },
        include: { menuItem: { select: { isPreparable: true } } },
      });
      const allReady = allItems.every((i) =>
        i.id === itemId ? true : i.status === 'READY',
      );

      if (allReady) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'READY' },
        });

        const order = await prisma.order.findUniqueOrThrow({
          where: { id: orderId },
          include: {
            table: { select: tableLabelSelect },
            items: { include: { menuItem: { select: { name: true } } } },
          },
        });

        getIo().to('waiters').emit('orders:ready', {
          orderId,
          tableNumber: order.table?.number ?? null,
          tableLabel: formatTableLabel(order.table),
          isTakeaway: order.isTakeaway,
          items: order.items.map((i) => ({
            id: i.id,
            name: i.menuItem.name,
            quantity: i.quantity,
          })),
        });
      }
    }

    getIo().to('kitchen').emit('orders:updated');

    res.json(updatedItem);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// PATCH /api/kitchen/orders/:orderId/status
// Criterion 4 of HCoc-01: cocinero advances entire order from PENDING → IN_PROGRESS
export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const orderId = req.params['orderId'] as string;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }
    if (order.status !== 'PENDING') {
      res.status(400).json({ error: 'Solo se pueden avanzar pedidos en estado Pendiente' });
      return;
    }

    await prisma.order.update({ where: { id: orderId }, data: { status: 'IN_PROGRESS' } });

    // Also advance all pending preparable items so per-item status stays consistent
    const pendingItems = await prisma.orderItem.findMany({
      where: { orderId, status: 'PENDING', menuItem: { isPreparable: true } },
      select: { id: true },
    });
    if (pendingItems.length > 0) {
      await prisma.orderItem.updateMany({
        where: { id: { in: pendingItems.map((i) => i.id) } },
        data: { status: 'IN_PROGRESS' },
      });
    }

    getIo().to('kitchen').emit('orders:updated');
    res.json({ orderId, status: 'IN_PROGRESS' });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Los pedidos listos ya no se auto-eliminan por tiempo: permanecen en cocina
// hasta que el mesero los marca como entregados. El job periódico ya no es
// necesario, pero se conserva la función (no-op) para no alterar server.ts.
export function startKitchenJob(): void {
  // intencionalmente vacío
}
