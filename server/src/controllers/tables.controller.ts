import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getIo } from '../services/socket.service';

async function fetchTablesWithActiveOrder() {
  const tables = await prisma.diningTable.findMany({
    orderBy: { number: 'asc' },
    select: {
      id: true,
      number: true,
      status: true,
      orders: {
        where: { OR: [{ status: 'PENDING' }, { status: 'IN_PROGRESS' }, { status: 'READY' }] },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  });
  return tables.map((t) => ({
    id: t.id,
    number: t.number,
    status: t.status,
    activeOrderId: t.orders[0]?.id ?? null,
  }));
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
