import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getIo } from '../services/socket.service';
import { broadcastTablesUpdate } from './tables.controller';

const createOrderSchema = z.object({
  tableId: z.number().int().positive().optional(),
  isTakeaway: z.boolean(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, 'Se requiere al menos 1 ítem'),
});

const addItemsSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, 'Se requiere al menos 1 ítem'),
});

function generateCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    const result = createOrderSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const { tableId, isTakeaway, notes, items } = result.data;

    if (!isTakeaway && tableId === undefined) {
      res.status(400).json({ error: 'Se requiere tableId para pedidos en mesa' });
      return;
    }

    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });
    if (menuItems.length !== menuItemIds.length) {
      res.status(400).json({ error: 'Uno o más platos no existen' });
      return;
    }
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    const total = items.reduce((sum, item) => {
      const price = Number(menuItemMap.get(item.menuItemId)!.price);
      return sum + price * item.quantity;
    }, 0);

    // Create order inside transaction (no include — TS6+Prisma v7 can't infer it in tx)
    const createdOrder = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          code: generateCode(),
          tableId: isTakeaway ? null : tableId,
          createdById: req.user!.userId,
          status: 'PENDING',
          isTakeaway,
          notes,
          total,
          items: {
            create: items.map((item) => {
              const menuItem = menuItemMap.get(item.menuItemId)!;
              const unitPrice = Number(menuItem.price);
              return {
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                unitPrice,
                subtotal: unitPrice * item.quantity,
                status: 'PENDING',
              };
            }),
          },
        },
      });

      if (!isTakeaway && tableId !== undefined) {
        await tx.diningTable.update({
          where: { id: tableId },
          data: { status: 'OCCUPIED' },
        });
      }

      return newOrder;
    });

    // Fetch the full order with relations (findMany-style query works with TS6+Prisma v7)
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: createdOrder.id },
      include: {
        items: { include: { menuItem: { select: { name: true } } } },
        table: { select: { number: true } },
      },
    });

    if (!isTakeaway) {
      await broadcastTablesUpdate();
    }

    getIo().to('kitchen').emit('orders:new', {
      orderId: order.id,
      code: order.code,
      tableNumber: order.table?.number ?? null,
      isTakeaway: order.isTakeaway,
      notes: order.notes,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        status: item.status,
      })),
    });

    res.status(201).json(order);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function addOrderItems(req: Request, res: Response): Promise<void> {
  try {
    const orderId = req.params['orderId'] as string;
    const result = addItemsSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const { items } = result.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: { select: { number: true } } },
    });
    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }
    if (order.status === 'DELIVERED' || order.status === 'PAID') {
      res.status(400).json({ error: 'No se pueden agregar ítems a un pedido cerrado' });
      return;
    }

    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });
    if (menuItems.length !== menuItemIds.length) {
      res.status(400).json({ error: 'Uno o más platos no existen' });
      return;
    }
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    const newItems = await prisma.$transaction(
      items.map((item) => {
        const menuItem = menuItemMap.get(item.menuItemId)!;
        const unitPrice = Number(menuItem.price);
        return prisma.orderItem.create({
          data: {
            orderId,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice,
            subtotal: unitPrice * item.quantity,
            status: 'PENDING',
          },
          include: { menuItem: { select: { name: true } } },
        });
      }),
    );

    getIo().to('kitchen').emit('orders:new', {
      orderId,
      code: order.code,
      tableNumber: order.table?.number ?? null,
      isTakeaway: order.isTakeaway,
      notes: order.notes,
      items: newItems.map((item) => ({
        id: item.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        status: item.status,
      })),
    });

    res.status(201).json(newItems);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
