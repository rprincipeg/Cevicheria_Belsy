import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getIo } from '../services/socket.service';
import { broadcastTablesUpdate } from './tables.controller';

const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1),
  isTakeaway: z.boolean().optional().default(false),
});

const createOrderSchema = z.object({
  tableId: z.number().int().positive().optional(),
  isTakeaway: z.boolean(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Se requiere al menos 1 ítem'),
});

const addItemsSchema = z.object({
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Se requiere al menos 1 ítem'),
});

function generateCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

async function buildKitchenPayload(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: { include: { menuItem: { select: { name: true } } } },
      table: { select: { number: true } },
    },
  });
  return {
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
      isTakeaway: item.isTakeaway,
    })),
  };
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

    const createdOrder = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          code: generateCode(),
          // Keep tableId even for takeaway orders so kitchen sees the table number
          tableId: tableId ?? null,
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
                isTakeaway: item.isTakeaway,
              };
            }),
          },
        },
      });

      if (tableId !== undefined) {
        await tx.diningTable.update({
          where: { id: tableId },
          data: { status: 'OCCUPIED' },
        });
      }

      return newOrder;
    });

    const payload = await buildKitchenPayload(createdOrder.id);

    if (!isTakeaway) {
      await broadcastTablesUpdate();
    }

    getIo().to('kitchen').emit('orders:new', payload);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: createdOrder.id },
      include: {
        items: { include: { menuItem: { select: { name: true } } } },
        table: { select: { number: true } },
      },
    });

    res.status(201).json(order);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  try {
    const orderId = req.params['orderId'] as string;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { menuItem: { select: { id: true, name: true, price: true } } },
          orderBy: { createdAt: 'asc' },
        },
        table: { select: { number: true } },
      },
    });
    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }
    res.json(order);
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
    const { items, notes } = result.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: { select: { number: true, id: true } } },
    });
    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }
    if (order.status === 'DELIVERED' || order.status === 'PAID') {
      // El pedido ya fue cerrado — crear uno nuevo para la misma mesa
      const total = items.reduce((sum, item) => {
        const price = Number(menuItemMap.get(item.menuItemId)!.price);
        return sum + price * item.quantity;
      }, 0);
      const newOrder = await prisma.order.create({
        data: {
          code: generateCode(),
          tableId: order.tableId,
          createdById: req.user!.userId,
          status: 'PENDING',
          isTakeaway: order.isTakeaway,
          notes: notes ?? null,
          total,
          items: {
            create: items.map((item) => {
              const menuItem = menuItemMap.get(item.menuItemId)!;
              const unitPrice = Number(menuItem.price);
              return { menuItemId: item.menuItemId, quantity: item.quantity, unitPrice, subtotal: unitPrice * item.quantity, status: 'PENDING', isTakeaway: item.isTakeaway };
            }),
          },
        },
      });
      if (order.tableId) {
        await prisma.diningTable.update({ where: { id: order.tableId }, data: { status: 'OCCUPIED' } });
        await broadcastTablesUpdate();
      }
      const payload = await buildKitchenPayload(newOrder.id);
      getIo().to('kitchen').emit('orders:new', payload);
      const fullNewOrder = await prisma.order.findUniqueOrThrow({
        where: { id: newOrder.id },
        include: { items: { include: { menuItem: { select: { name: true } } } }, table: { select: { number: true } } },
      });
      res.status(201).json(fullNewOrder);
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

    // If the order is IN_PROGRESS or READY, create a new PENDING order instead
    if (order.status === 'IN_PROGRESS' || order.status === 'READY') {
      const total = items.reduce((sum, item) => {
        const price = Number(menuItemMap.get(item.menuItemId)!.price);
        return sum + price * item.quantity;
      }, 0);

      const newOrder = await prisma.order.create({
        data: {
          code: generateCode(),
          tableId: order.tableId,
          createdById: req.user!.userId,
          status: 'PENDING',
          isTakeaway: order.isTakeaway,
          notes: notes ?? null,
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
                isTakeaway: item.isTakeaway,
              };
            }),
          },
        },
      });

      const payload = await buildKitchenPayload(newOrder.id);
      getIo().to('kitchen').emit('orders:new', payload);

      const fullNewOrder = await prisma.order.findUniqueOrThrow({
        where: { id: newOrder.id },
        include: {
          items: { include: { menuItem: { select: { name: true } } } },
          table: { select: { number: true } },
        },
      });
      res.status(201).json(fullNewOrder);
      return;
    }

    // Order is PENDING — add items directly, updating notes if provided
    if (notes) {
      await prisma.order.update({ where: { id: orderId }, data: { notes } });
    }
    const effectiveNotes = notes ?? order.notes;

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
            isTakeaway: item.isTakeaway,
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
      notes: effectiveNotes,
      items: newItems.map((item) => ({
        id: item.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        status: item.status,
        isTakeaway: item.isTakeaway,
      })),
    });

    res.status(201).json(newItems);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
