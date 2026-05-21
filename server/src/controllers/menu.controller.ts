import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function getCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { stockStatus: 'AVAILABLE' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            stockStatus: true,
            isPreparable: true,
          },
        },
      },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
