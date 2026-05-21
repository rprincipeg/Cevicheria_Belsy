import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getIo } from '../services/socket.service';

const updateItemStatusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'READY']),
});

export async function getKitchenOrders(_req: Request, res: Response): Promise<void> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Use OR of active statuses to avoid notIn type issues with TS6+Prisma v7
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          { status: 'IN_PROGRESS' },
          { status: 'READY' },
        ],
      },
      include: {
        table: { select: { number: true } },
        items: {
          where: {
            OR: [
              { status: 'PENDING' },
              { status: 'IN_PROGRESS' },
              { readyAt: { gt: fiveMinutesAgo } },
            ],
          },
          orderBy: { createdAt: 'asc' },
          include: { menuItem: { select: { name: true } } },
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
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          status: item.status,
          readyAt: item.readyAt,
          createdAt: item.createdAt,
          isTakeaway: order.isTakeaway,
          orderNotes: order.notes,
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

    if (status === 'READY') {
      const allItems = await prisma.orderItem.findMany({ where: { orderId: orderId } });
      const allReady = allItems.every((i) =>
        i.id === itemId ? true : i.status === 'READY',
      );

      if (allReady) {
        // Update status without include (TS6+Prisma v7 issue with update+include)
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'READY' },
        });

        // Fetch with include separately (findMany-style queries work fine)
        const order = await prisma.order.findUniqueOrThrow({
          where: { id: orderId },
          include: {
            table: { select: { number: true } },
            items: { include: { menuItem: { select: { name: true } } } },
          },
        });

        getIo().to('waiters').emit('orders:ready', {
          orderId,
          tableNumber: order.table?.number ?? null,
          items: order.items.map((i) => ({
            id: i.id,
            name: i.menuItem.name,
            quantity: i.quantity,
          })),
        });
      }
    }

    res.json(updatedItem);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export function startKitchenJob(): void {
  setInterval(async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const staleItems = await prisma.orderItem.findMany({
        where: { status: 'READY', readyAt: { lte: fiveMinutesAgo } },
        select: { id: true },
      });
      if (staleItems.length > 0) {
        getIo().to('kitchen').emit('orders:updated');
      }
    } catch (err) {
      console.error('[kitchen-job]', err);
    }
  }, 60_000);
}
