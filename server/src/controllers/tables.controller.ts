import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getIo } from '../services/socket.service';

export async function broadcastTablesUpdate(): Promise<void> {
  const tables = await prisma.diningTable.findMany({
    orderBy: { number: 'asc' },
    select: { id: true, number: true, status: true },
  });
  getIo().emit('tables:updated', [...tables, { id: 'takeaway', type: 'takeaway' }]);
}

export async function getTables(_req: Request, res: Response): Promise<void> {
  try {
    const tables = await prisma.diningTable.findMany({
      orderBy: { number: 'asc' },
      select: { id: true, number: true, status: true },
    });
    res.json([...tables, { id: 'takeaway', type: 'takeaway' }]);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
