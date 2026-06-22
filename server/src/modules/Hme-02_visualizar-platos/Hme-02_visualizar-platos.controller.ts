import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { getIo } from '../../shared/services/socket.service';
import { broadcastTablesUpdate } from '../Hme-01_mapa-mesas/Hme-01_mapa-mesas.controller';
import { tableLabelSelect, formatTableLabel } from '../../shared/utils/table-label';

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

// Recargo por plato "para llevar": S/ 1.00 adicional por cada unidad marcada
// como para llevar. Se aplica sobre el precio base del plato.
const TAKEAWAY_SURCHARGE = 1;
function unitPriceFor(basePrice: number, isTakeaway?: boolean): number {
  return basePrice + (isTakeaway ? TAKEAWAY_SURCHARGE : 0);
}

async function buildKitchenPayload(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: { include: { menuItem: { select: { name: true, isPreparable: true } } } },
      table: { select: tableLabelSelect },
    },
  });
  return {
    orderId: order.id,
    code: order.code,
    tableNumber: order.table?.number ?? null,
    tableLabel: formatTableLabel(order.table),
    isTakeaway: order.isTakeaway,
    notes: order.notes,
    // Non-preparable items (drinks) bypass the kitchen entirely
    items: order.items
      .filter((item) => item.menuItem.isPreparable)
      .map((item) => ({
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

    if (tableId !== undefined) {
      const tbl = await prisma.diningTable.findUnique({ where: { id: tableId }, select: { status: true } });
      if (tbl?.status === 'MERGED') {
        res.status(400).json({ error: 'Esta mesa está fusionada con otra. Añade los pedidos a la mesa de destino.' });
        return;
      }
    }

    const menuItemIds = items.map((i) => i.menuItemId);
    const uniqueMenuItemIds = [...new Set(menuItemIds)];
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: uniqueMenuItemIds } },
    });
    if (menuItems.length !== uniqueMenuItemIds.length) {
      res.status(400).json({ error: 'Uno o más platos no existen' });
      return;
    }
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    const now = new Date();
    const total = items.reduce((sum, item) => {
      const price = Number(menuItemMap.get(item.menuItemId)!.price);
      return sum + price * item.quantity;
    }, 0);

    const hasPreparable    = items.some((i) =>  menuItemMap.get(i.menuItemId)!.isPreparable);
    const hasNonPreparable = items.some((i) => !menuItemMap.get(i.menuItemId)!.isPreparable);

    const createdOrder = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          code: generateCode(),
          tableId: tableId ?? null,
          createdById: req.user!.userId,
          status: 'PENDING',
          isTakeaway,
          notes,
          total,
          items: {
            create: items.flatMap((item) => {
              const menuItem = menuItemMap.get(item.menuItemId)!;
              const unitPrice = unitPriceFor(Number(menuItem.price), item.isTakeaway);
              // Non-preparable items (drinks) are immediately READY — no kitchen step needed
              const isPrep = menuItem.isPreparable;
              return Array.from({ length: item.quantity }, () => ({
                menuItemId: item.menuItemId,
                quantity: 1,
                unitPrice,
                subtotal: unitPrice,
                status: (isPrep ? 'PENDING' : 'READY') as 'PENDING' | 'READY',
                readyAt: isPrep ? undefined : now,
                isTakeaway: item.isTakeaway,
              }));
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

    if (!isTakeaway) {
      await broadcastTablesUpdate();
    }

    if (!hasPreparable) {
      // Drink-only order: advance to READY and notify waiters immediately
      await prisma.order.update({ where: { id: createdOrder.id }, data: { status: 'READY' } });
      const orderFull = await prisma.order.findUniqueOrThrow({
        where: { id: createdOrder.id },
        include: {
          table: { select: tableLabelSelect },
          items: { include: { menuItem: { select: { name: true } } } },
        },
      });
      getIo().to('waiters').emit('orders:ready', {
        orderId: createdOrder.id,
        tableNumber: orderFull.table?.number ?? null,
        tableLabel: formatTableLabel(orderFull.table),
        isTakeaway,
        items: orderFull.items.map((i) => ({ id: i.id, name: i.menuItem.name, quantity: i.quantity })),
      });
      getIo().to('kitchen').emit('orders:updated');
    } else {
      const payload = await buildKitchenPayload(createdOrder.id);
      getIo().to('kitchen').emit('orders:new', payload);
      if (hasNonPreparable) {
        // Refresh waiter delivery view so drinks appear as immediately ready
        getIo().to('waiters').emit('orders:updated');
      }
    }

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
      include: { table: { select: { number: true, id: true, mergedSources: { select: { number: true }, orderBy: { number: 'asc' } } } } },
    });
    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }

    // Fetch menu items early — needed across all branches below
    const menuItemIds = items.map((i) => i.menuItemId);
    const uniqueMenuItemIds = [...new Set(menuItemIds)];
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: uniqueMenuItemIds } },
    });
    if (menuItems.length !== uniqueMenuItemIds.length) {
      res.status(400).json({ error: 'Uno o más platos no existen' });
      return;
    }
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    if (order.status === 'DELIVERED' || order.status === 'PAID') {
      // Order was closed — create a new PENDING order for the same table
      const now2 = new Date();
      const total = items.reduce((sum, item) => {
        const price = unitPriceFor(Number(menuItemMap.get(item.menuItemId)!.price), item.isTakeaway);
        return sum + price * item.quantity;
      }, 0);
      const hasPrep2    = items.some((i) =>  menuItemMap.get(i.menuItemId)!.isPreparable);
      const hasNonPrep2 = items.some((i) => !menuItemMap.get(i.menuItemId)!.isPreparable);
      const newOrder = await prisma.$transaction(async (tx) => {
        const order_ = await tx.order.create({
          data: {
            code: generateCode(),
            tableId: order.tableId,
            createdById: req.user!.userId,
            status: 'PENDING',
            isTakeaway: order.isTakeaway,
            notes: notes ?? null,
            total,
            items: {
              create: items.flatMap((item) => {
                const menuItem = menuItemMap.get(item.menuItemId)!;
                const unitPrice = unitPriceFor(Number(menuItem.price), item.isTakeaway);
                const isPrep = menuItem.isPreparable;
                return Array.from({ length: item.quantity }, () => ({
                  menuItemId: item.menuItemId,
                  quantity: 1,
                  unitPrice,
                  subtotal: unitPrice,
                  status: (isPrep ? 'PENDING' : 'READY') as 'PENDING' | 'READY',
                  readyAt: isPrep ? undefined : now2,
                  isTakeaway: item.isTakeaway,
                }));
              }),
            },
          },
        });
        if (order.tableId) {
          await tx.diningTable.update({ where: { id: order.tableId }, data: { status: 'OCCUPIED' } });
        }
        return order_;
      });
      if (order.tableId) await broadcastTablesUpdate();
      if (!hasPrep2) {
        await prisma.order.update({ where: { id: newOrder.id }, data: { status: 'READY' } });
        const orderFull2 = await prisma.order.findUniqueOrThrow({
          where: { id: newOrder.id },
          include: { table: { select: tableLabelSelect }, items: { include: { menuItem: { select: { name: true } } } } },
        });
        getIo().to('waiters').emit('orders:ready', {
          orderId: newOrder.id,
          tableNumber: orderFull2.table?.number ?? null,
          tableLabel: formatTableLabel(orderFull2.table),
          isTakeaway: order.isTakeaway,
          items: orderFull2.items.map((i) => ({ id: i.id, name: i.menuItem.name, quantity: i.quantity })),
        });
        getIo().to('kitchen').emit('orders:updated');
      } else {
        const payload = await buildKitchenPayload(newOrder.id);
        getIo().to('kitchen').emit('orders:new', payload);
        if (hasNonPrep2) getIo().to('waiters').emit('orders:updated');
      }
      const fullNewOrder = await prisma.order.findUniqueOrThrow({
        where: { id: newOrder.id },
        include: { items: { include: { menuItem: { select: { name: true } } } }, table: { select: { number: true } } },
      });
      res.status(201).json(fullNewOrder);
      return;
    }

    // If the order is IN_PROGRESS or READY, create a new PENDING order instead
    if (order.status === 'IN_PROGRESS' || order.status === 'READY') {
      const now3 = new Date();
      const total = items.reduce((sum, item) => {
        const price = unitPriceFor(Number(menuItemMap.get(item.menuItemId)!.price), item.isTakeaway);
        return sum + price * item.quantity;
      }, 0);
      const hasPrep3    = items.some((i) =>  menuItemMap.get(i.menuItemId)!.isPreparable);
      const hasNonPrep3 = items.some((i) => !menuItemMap.get(i.menuItemId)!.isPreparable);

      const newOrder2 = await prisma.$transaction(async (tx) => {
        const order_ = await tx.order.create({
          data: {
            code: generateCode(),
            tableId: order.tableId,
            createdById: req.user!.userId,
            status: 'PENDING',
            isTakeaway: order.isTakeaway,
            notes: notes ?? null,
            total,
            items: {
              create: items.flatMap((item) => {
                const menuItem = menuItemMap.get(item.menuItemId)!;
                const unitPrice = unitPriceFor(Number(menuItem.price), item.isTakeaway);
                const isPrep = menuItem.isPreparable;
                return Array.from({ length: item.quantity }, () => ({
                  menuItemId: item.menuItemId,
                  quantity: 1,
                  unitPrice,
                  subtotal: unitPrice,
                  status: (isPrep ? 'PENDING' : 'READY') as 'PENDING' | 'READY',
                  readyAt: isPrep ? undefined : now3,
                  isTakeaway: item.isTakeaway,
                }));
              }),
            },
          },
        });
        return order_;
      });

      if (!hasPrep3) {
        await prisma.order.update({ where: { id: newOrder2.id }, data: { status: 'READY' } });
        const orderFull3 = await prisma.order.findUniqueOrThrow({
          where: { id: newOrder2.id },
          include: { table: { select: tableLabelSelect }, items: { include: { menuItem: { select: { name: true } } } } },
        });
        getIo().to('waiters').emit('orders:ready', {
          orderId: newOrder2.id,
          tableNumber: orderFull3.table?.number ?? null,
          tableLabel: formatTableLabel(orderFull3.table),
          isTakeaway: order.isTakeaway,
          items: orderFull3.items.map((i) => ({ id: i.id, name: i.menuItem.name, quantity: i.quantity })),
        });
        getIo().to('kitchen').emit('orders:updated');
      } else {
        const payload = await buildKitchenPayload(newOrder2.id);
        getIo().to('kitchen').emit('orders:new', payload);
        if (hasNonPrep3) getIo().to('waiters').emit('orders:updated');
      }

      const fullNewOrder = await prisma.order.findUniqueOrThrow({
        where: { id: newOrder2.id },
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
    const now4 = new Date();

    const hasPrep4    = items.some((i) =>  menuItemMap.get(i.menuItemId)!.isPreparable);
    const hasNonPrep4 = items.some((i) => !menuItemMap.get(i.menuItemId)!.isPreparable);

    const newItems = await Promise.all(
      items.flatMap((item) => {
        const menuItem = menuItemMap.get(item.menuItemId)!;
        const unitPrice = unitPriceFor(Number(menuItem.price), item.isTakeaway);
        const isPrep = menuItem.isPreparable;
        return Array.from({ length: item.quantity }, () =>
          prisma.orderItem.create({
            data: {
              orderId,
              menuItemId: item.menuItemId,
              quantity: 1,
              unitPrice,
              subtotal: unitPrice,
              status: isPrep ? 'PENDING' : 'READY',
              readyAt: isPrep ? undefined : now4,
              isTakeaway: item.isTakeaway,
            },
            include: { menuItem: { select: { name: true, isPreparable: true } } },
          })
        );
      }),
    );

    // Mantener el total del pedido al día con los ítems añadidos (incl. recargo
    // por "para llevar"), de modo que la cuenta refleje el monto correcto.
    const addedTotal = items.reduce((sum, item) => {
      const price = unitPriceFor(Number(menuItemMap.get(item.menuItemId)!.price), item.isTakeaway);
      return sum + price * item.quantity;
    }, 0);
    await prisma.order.update({
      where: { id: orderId },
      data: { total: { increment: addedTotal } },
    });

    if (hasPrep4) {
      getIo().to('kitchen').emit('orders:new', {
        orderId,
        code: order.code,
        tableNumber: order.table?.number ?? null,
        tableLabel: formatTableLabel(order.table),
        isTakeaway: order.isTakeaway,
        notes: effectiveNotes,
        items: newItems
          .filter((item) => item.menuItem.isPreparable)
          .map((item) => ({
            id: item.id,
            name: item.menuItem.name,
            quantity: item.quantity,
            status: item.status,
            isTakeaway: item.isTakeaway,
          })),
      });
    }
    if (hasNonPrep4) {
      getIo().to('waiters').emit('orders:updated');
    }

    res.status(201).json(newItems);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── GET /api/orders/active ───────────────────────────────────────────────────
// Returns all PENDING, IN_PROGRESS, READY orders for the mesero monitor (Hme-03 criterio 6)
export async function getActiveOrders(_req: Request, res: Response): Promise<void> {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS', 'READY'] },
      },
      include: {
        table: { select: tableLabelSelect },
        items: {
          include: { menuItem: { select: { name: true, isPreparable: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const result = orders.map((order) => ({
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
        isPreparable: item.menuItem.isPreparable,
      })),
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv2

// ─── PATCH /api/orders/:orderId/deliver ──────────────────────────────────────
// Mesero marca un pedido como entregado (Hme-03)
// Requisitos de la historia:
//   - Solo se puede entregar si está en estado READY (criterio 10)
//   - Registra fecha, hora y usuario que entregó (criterio 9)
//   - Emite evento en tiempo real para que otros meseros descarten la alerta (criterio 1, 4)
export async function deliverOrder(req: Request, res: Response): Promise<void> {
  try {
    const orderId = req.params['orderId'] as string;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: { select: tableLabelSelect } },
    });

    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }

    if (order.status !== 'READY') {
      res.status(400).json({
        error: 'Solo se pueden entregar pedidos en estado Listo',
        currentStatus: order.status,
      });
      return;
    }

    // Update: DELIVERED + audit fields (requires db:migrate for new columns)
    const now = new Date();
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: now,
        deliveredById: req.user!.userId,
      } as any, // typed correctly after: npm run db:migrate && npm run db:generate
      include: {
        table: { select: { number: true } },
        items: { include: { menuItem: { select: { name: true } } } },
      },
    });

    // Notify all waiters to dismiss this notification
    getIo().to('waiters').emit('orders:delivered', {
      orderId,
      tableNumber: order.table?.number ?? null,
      tableLabel: formatTableLabel(order.table),
      isTakeaway: order.isTakeaway,
      deliveredAt: now,
      deliveredByUsername: req.user!.username,
    });

    // Refresh kitchen view (delivered orders disappear from kitchen)
    getIo().to('kitchen').emit('orders:updated');

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv2

// ─── PATCH /api/orders/:orderId/items/:itemId/deliver ─────────────────────────
// Mesero marca un ítem individual como entregado (Hme-03).
//   - Ítems preparables solo se entregan si están en estado READY
//   - Ítems no preparables (bebidas) se pueden entregar directamente
//   - Cuando todos los ítems del pedido quedan entregados/cancelados, el pedido
//     pasa a DELIVERED
export async function deliverOrderItem(req: Request, res: Response): Promise<void> {
  try {
    const orderId = req.params['orderId'] as string;
    const itemId = req.params['itemId'] as string;

    const item = await prisma.orderItem.findFirst({
      where: { id: itemId, orderId },
      include: {
        menuItem: { select: { name: true, isPreparable: true } },
        order: { select: { isTakeaway: true, table: { select: tableLabelSelect } } },
      },
    });

    if (!item) {
      res.status(404).json({ error: 'Ítem no encontrado' });
      return;
    }

    const alreadyDone = item.status === 'DELIVERED' || item.status === 'CANCELLED';
    const deliverable = !alreadyDone &&
      (item.menuItem.isPreparable ? item.status === 'READY' : true);

    if (!deliverable) {
      res.status(400).json({
        error: 'Solo se pueden entregar ítems listos',
        currentStatus: item.status,
      });
      return;
    }

    await prisma.orderItem.update({
      where: { id: itemId },
      data: { status: 'DELIVERED' },
    });

    // ¿Quedan todos los ítems del pedido entregados o cancelados?
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      select: { id: true, status: true },
    });
    const allDone = items.every((i) =>
      i.id === itemId ? true : (i.status === 'DELIVERED' || i.status === 'CANCELLED'),
    );

    const now = new Date();
    let orderDelivered = false;
    if (allDone) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          deliveredAt: now,
          deliveredById: req.user!.userId,
        } as any,
      });
      orderDelivered = true;
    }

    getIo().to('waiters').emit('orders:itemDelivered', {
      orderId,
      itemId,
      orderDelivered,
    });

    if (orderDelivered) {
      getIo().to('waiters').emit('orders:delivered', {
        orderId,
        tableNumber: item.order.table?.number ?? null,
        tableLabel: formatTableLabel(item.order.table),
        isTakeaway: item.order.isTakeaway,
        deliveredAt: now,
        deliveredByUsername: req.user!.username,
      });
    }

    getIo().to('kitchen').emit('orders:updated');

    res.json({ ok: true, itemId, orderDelivered });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -EDITADOv7
