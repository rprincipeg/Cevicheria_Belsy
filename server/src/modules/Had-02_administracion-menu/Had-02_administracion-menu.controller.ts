import { Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../lib/prisma';
import { getIo } from '../../shared/services/socket.service';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function broadcastMenuUpdate(): void {
  getIo().emit('menu:updated');
}

// ─── MESERO: read-only, all items (with stockStatus visible) ─────────────────

export async function getCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isActive: true }, // ocultar platos "eliminados" (soft-delete)
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            stockStatus: true,
            isPreparable: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -EDITADOv2 (removido filtro stockStatus para mostrar todos los platos con su estado — Hme-02 criterio 4)

// ─── ADMIN: CATEGORÍAS ───────────────────────────────────────────────────────

export async function getAdminCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isActive: true }, // ocultar platos "eliminados" (soft-delete)
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            stockStatus: true,
            isPreparable: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv2

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const result = createCategorySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const { name, sortOrder, isActive } = result.data;

    const category = await prisma.category.create({
      data: { name, sortOrder, isActive },
    });

    broadcastMenuUpdate();
    res.status(201).json(category);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv2

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function updateCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const result = updateCategorySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }

    const category = await prisma.category.update({
      where: { id },
      data: result.data,
    });

    broadcastMenuUpdate();
    res.json(category);
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }
    if (err?.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv2

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;

    const itemCount = await prisma.menuItem.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      res.status(409).json({ error: 'No se puede eliminar una categoría que tiene platos asociados' });
      return;
    }

    await prisma.category.delete({ where: { id } });

    broadcastMenuUpdate();
    res.status(204).send();
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv2

// ─── ADMIN: PLATOS ───────────────────────────────────────────────────────────

const createMenuItemSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(300).optional().nullable(),
  price: z.number().positive(),
  categoryId: z.string().min(1),
  isPreparable: z.boolean().default(true),
});

export async function createMenuItem(req: Request, res: Response): Promise<void> {
  try {
    const result = createMenuItemSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const { name, description, price, categoryId, isPreparable } = result.data;

    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      res.status(400).json({ error: 'La categoría especificada no existe' });
      return;
    }

    const item = await prisma.menuItem.create({
      data: {
        name,
        description: description ?? null,
        price,
        categoryId,
        isPreparable,
        stockStatus: 'AVAILABLE',
      },
    });

    broadcastMenuUpdate();
    res.status(201).json(item);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un plato con ese nombre' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv2

const updateMenuItemSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(300).optional().nullable(),
  price: z.number().positive().optional(),
  categoryId: z.string().min(1).optional(),
  isPreparable: z.boolean().optional(),
});

export async function updateMenuItem(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const result = updateMenuItemSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }

    if (result.data.categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: result.data.categoryId },
      });
      if (!categoryExists) {
        res.status(400).json({ error: 'La categoría especificada no existe' });
        return;
      }
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: result.data,
    });

    broadcastMenuUpdate();
    res.json(item);
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Plato no encontrado' });
      return;
    }
    if (err?.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un plato con ese nombre' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv2

export async function deleteMenuItem(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;

    // Si el plato tiene historial de pedidos, no se puede borrar físicamente
    // (rompería la integridad de los reportes/comprobantes): se hace soft-delete
    // marcándolo inactivo para que desaparezca del menú pero conserve su historial.
    const orderCount = await prisma.orderItem.count({ where: { menuItemId: id } });
    if (orderCount > 0) {
      await prisma.menuItem.update({ where: { id }, data: { isActive: false } });
    } else {
      await prisma.menuItem.delete({ where: { id } });
    }

    broadcastMenuUpdate();
    res.status(204).send();
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Plato no encontrado' });
      return;
    }
    if (err?.code === 'P2003') {
      res.status(409).json({
        error: 'No se puede eliminar el plato porque tiene pedidos asociados',
      });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv2

const stockSchema = z.object({
  stockStatus: z.enum(['AVAILABLE', 'OUT_OF_STOCK']),
});

export async function setMenuItemStock(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const result = stockSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const { stockStatus } = result.data;

    const item = await prisma.menuItem.update({
      where: { id },
      data: { stockStatus },
    });

    broadcastMenuUpdate();
    res.json(item);
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Plato no encontrado' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv2

// ─── ADMIN: IMAGEN DE PLATO ───────────────────────────────────────────────────

export async function uploadMenuItemImage(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;

    if (!req.file) {
      res.status(400).json({ error: 'Se requiere una imagen' });
      return;
    }

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      fs.unlink(req.file.path, () => {});
      res.status(404).json({ error: 'Plato no encontrado' });
      return;
    }

    // Remove previous image file if it was stored locally
    if (existing.imageUrl?.startsWith('/uploads/')) {
      const oldFile = path.join(
        __dirname, '..', '..', '..', 'uploads',
        path.basename(existing.imageUrl),
      );
      fs.unlink(oldFile, () => {});
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const item = await prisma.menuItem.update({ where: { id }, data: { imageUrl } });

    broadcastMenuUpdate();
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv2

export async function deleteMenuItemImage(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Plato no encontrado' });
      return;
    }

    if (existing.imageUrl?.startsWith('/uploads/')) {
      const file = path.join(
        __dirname, '..', '..', '..', 'uploads',
        path.basename(existing.imageUrl),
      );
      fs.unlink(file, () => {});
    }

    const item = await prisma.menuItem.update({ where: { id }, data: { imageUrl: null } });

    broadcastMenuUpdate();
    res.json(item);
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Plato no encontrado' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv2
