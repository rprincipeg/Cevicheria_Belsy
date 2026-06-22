// Had-05: Control de almacén e insumos
// Had-06: Vinculación de insumos a platos
//
// Módulo removible: toda la lógica de inventario/almacén está aquí.
// Para desactivarlo: borrar este archivo, inventory.routes.ts y las 3 líneas de
// integración en app.ts, menu.routes.ts y orders.controller.ts marcadas -EDITADOv5.

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { getIo } from '../../shared/services/socket.service';

// Alias para los modelos nuevos (aún no en el cliente Prisma generado)
const db = prisma as any;

// ─── HELPERS INTERNOS ────────────────────────────────────────────────────────

function broadcastMenuUpdate(): void {
  getIo().emit('menu:updated');
}

// Recalcula el stockStatus de un MenuItem según sus RecipeItems actuales.
// Solo actúa sobre ítems que TIENEN receta; los sin receta se gestionan manualmente.
async function syncMenuItemAvailability(menuItemId: string): Promise<boolean> {
  const allRecipes = await db.recipeItem.findMany({
    where: { menuItemId },
    include: { supply: { select: { currentStock: true } } },
  });
  if ((allRecipes as any[]).length === 0) return false; // Sin receta: sin cambio automático

  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    select: { stockStatus: true },
  });
  if (!menuItem) return false;

  const shouldBlock = (allRecipes as any[]).some(
    (r) => Number(r.supply.currentStock) <= 0,
  );

  if (shouldBlock && menuItem.stockStatus === 'AVAILABLE') {
    await prisma.menuItem.update({
      where: { id: menuItemId },
      data: { stockStatus: 'OUT_OF_STOCK' },
    });
    return true;
  }
  if (!shouldBlock && menuItem.stockStatus === 'OUT_OF_STOCK') {
    await prisma.menuItem.update({
      where: { id: menuItemId },
      data: { stockStatus: 'AVAILABLE' },
    });
    return true;
  }
  return false;
}

// ─── HELPERS EXPORTADOS (usados en orders.controller.ts) ─────────────────────

// Verifica si hay stock suficiente para los ítems del pedido.
// Retorna [] si OK, o la lista de insumos insuficientes para mostrar al mesero.
export async function checkStockForItems(
  orderItems: Array<{ menuItemId: string; quantity: number }>,
): Promise<Array<{ supplyName: string; needed: number; available: number; unit: string }>> {
  const menuItemIds = orderItems.map((i) => i.menuItemId);
  const recipeItems = await db.recipeItem.findMany({
    where: { menuItemId: { in: menuItemIds } },
    include: { supply: { select: { id: true, name: true, currentStock: true, unit: true } } },
  });

  if ((recipeItems as any[]).length === 0) return [];

  // Agregar cantidades requeridas por insumo
  const needs = new Map<string, { supply: any; totalNeeded: number }>();
  for (const r of recipeItems as any[]) {
    const orderItem = orderItems.find((i) => i.menuItemId === r.menuItemId);
    if (!orderItem) continue;
    const needed = Number(r.quantity) * orderItem.quantity;
    const entry = needs.get(r.supplyId);
    if (entry) {
      entry.totalNeeded += needed;
    } else {
      needs.set(r.supplyId, { supply: r.supply, totalNeeded: needed });
    }
  }

  const insufficient: Array<{ supplyName: string; needed: number; available: number; unit: string }> = [];
  for (const { supply, totalNeeded } of needs.values()) {
    const available = Number(supply.currentStock);
    if (available < totalNeeded) {
      insufficient.push({
        supplyName: supply.name,
        needed: totalNeeded,
        available,
        unit: supply.unit,
      });
    }
  }
  return insufficient;
}

// Descuenta stock dentro de una transacción Prisma activa.
// Retorna los IDs de los insumos afectados para llamar syncAfterStockChange después.
export async function deductStockWithinTx(
  orderItems: Array<{ menuItemId: string; quantity: number }>,
  tx: any,
): Promise<string[]> {
  const menuItemIds = orderItems.map((i) => i.menuItemId);
  const recipeItems = await tx.recipeItem.findMany({
    where: { menuItemId: { in: menuItemIds } },
  });
  if ((recipeItems as any[]).length === 0) return [];

  const needs = new Map<string, number>();
  for (const r of recipeItems as any[]) {
    const orderItem = orderItems.find((i) => i.menuItemId === r.menuItemId);
    if (!orderItem) continue;
    const needed = Number(r.quantity) * orderItem.quantity;
    needs.set(r.supplyId, (needs.get(r.supplyId) ?? 0) + needed);
  }

  for (const [supplyId, needed] of needs.entries()) {
    await tx.supply.update({
      where: { id: supplyId },
      data: { currentStock: { decrement: needed } },
    });
  }

  return Array.from(needs.keys());
}

// Después de cualquier cambio de stock: sincroniza disponibilidad de platos y emite
// alertas de socket. Llamar siempre con los IDs de insumos que cambiaron.
export async function syncAfterStockChange(supplyIds: string[]): Promise<void> {
  if (supplyIds.length === 0) return;

  const supplies = await db.supply.findMany({ where: { id: { in: supplyIds } } });

  // Encontrar todos los menuItems que usan alguno de estos insumos
  const recipeItems = await db.recipeItem.findMany({
    where: { supplyId: { in: supplyIds } },
    select: { menuItemId: true },
  });
  const affectedIds = [...new Set((recipeItems as any[]).map((r) => r.menuItemId as string))];

  let menuChanged = false;
  for (const menuItemId of affectedIds) {
    const changed = await syncMenuItemAvailability(menuItemId);
    if (changed) menuChanged = true;
  }
  if (menuChanged) broadcastMenuUpdate();

  // Emitir alertas de insumos
  const io = getIo();
  for (const supply of supplies as any[]) {
    const stock = Number(supply.currentStock);
    const min = Number(supply.minStock);
    if (stock <= 0) {
      io.emit('inventory:out_of_stock', {
        supplyId: supply.id,
        supplyName: supply.name,
        unit: supply.unit,
      });
    } else if (min > 0 && stock < min) {
      io.emit('inventory:low_stock', {
        supplyId: supply.id,
        supplyName: supply.name,
        currentStock: stock,
        minStock: min,
        unit: supply.unit,
      });
    }
  }
}

// ─── CATEGORÍAS DE INSUMOS ───────────────────────────────────────────────────

export async function getSupplyCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await db.supplyCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { supplies: { select: { id: true, name: true, unit: true, currentStock: true, minStock: true } } },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

const createSupplyCategorySchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).default(0),
});

export async function createSupplyCategory(req: Request, res: Response): Promise<void> {
  try {
    const result = createSupplyCategorySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const category = await db.supplyCategory.create({ data: result.data });
    res.status(201).json(category);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una categoría de insumos con ese nombre' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

const updateSupplyCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function updateSupplyCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const result = updateSupplyCategorySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const category = await db.supplyCategory.update({ where: { id }, data: result.data });
    res.json(category);
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Categoría de insumos no encontrada' });
      return;
    }
    if (err?.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una categoría de insumos con ese nombre' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function deleteSupplyCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const supplyCount = await db.supply.count({ where: { categoryId: id } });
    if (supplyCount > 0) {
      res.status(409).json({ error: 'No se puede eliminar una categoría que tiene insumos asociados' });
      return;
    }
    await db.supplyCategory.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Categoría de insumos no encontrada' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── INSUMOS ─────────────────────────────────────────────────────────────────

// Devuelve todos los insumos con su indicador de alerta (OK / LOW / OUT)
export async function getSupplies(_req: Request, res: Response): Promise<void> {
  try {
    const supplies = await db.supply.findMany({
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ categoryId: 'asc' }, { name: 'asc' }],
    });

    const result = (supplies as any[]).map((s) => {
      const stock = Number(s.currentStock);
      const min = Number(s.minStock);
      const stockAlert: 'OUT' | 'LOW' | 'OK' =
        stock <= 0 ? 'OUT' : min > 0 && stock < min ? 'LOW' : 'OK';
      return { ...s, currentStock: stock, minStock: min, stockAlert };
    });

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

const createSupplySchema = z.object({
  name: z.string().min(1).max(150),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'UNITS']),
  minStock: z.number().min(0).default(0),
  currentStock: z.number().min(0).default(0),
  categoryId: z.string().min(1),
});

export async function createSupply(req: Request, res: Response): Promise<void> {
  try {
    const result = createSupplySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const categoryExists = await db.supplyCategory.findUnique({ where: { id: result.data.categoryId } });
    if (!categoryExists) {
      res.status(400).json({ error: 'La categoría de insumos especificada no existe' });
      return;
    }
    const supply = await db.supply.create({ data: result.data });
    res.status(201).json(supply);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un insumo con ese nombre' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

const updateSupplySchema = z.object({
  name: z.string().min(1).max(150).optional(),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'UNITS']).optional(),
  minStock: z.number().min(0).optional(),
  categoryId: z.string().min(1).optional(),
});

export async function updateSupply(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const result = updateSupplySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    if (result.data.categoryId) {
      const catExists = await db.supplyCategory.findUnique({ where: { id: result.data.categoryId } });
      if (!catExists) {
        res.status(400).json({ error: 'La categoría de insumos especificada no existe' });
        return;
      }
    }
    const supply = await db.supply.update({ where: { id }, data: result.data });
    res.json(supply);
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Insumo no encontrado' });
      return;
    }
    if (err?.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un insumo con ese nombre' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function deleteSupply(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const recipeCount = await db.recipeItem.count({ where: { supplyId: id } });
    if (recipeCount > 0) {
      res.status(409).json({ error: 'No se puede eliminar un insumo que está en la receta de uno o más platos' });
      return;
    }
    await db.supply.delete({ where: { id } });
    res.status(204).send();
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Insumo no encontrado' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Registra entrada de mercadería (suma al stock actual)
const registerStockSchema = z.object({
  quantity: z.number().positive({ message: 'La cantidad debe ser mayor a 0' }),
});

export async function registerStock(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const result = registerStockSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const existing = await db.supply.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Insumo no encontrado' });
      return;
    }
    const updated = await db.supply.update({
      where: { id },
      data: { currentStock: { increment: result.data.quantity } },
    });

    // Sincronizar disponibilidad de platos y emitir alertas de socket
    await syncAfterStockChange([id]);

    res.json({ ...updated, currentStock: Number(updated.currentStock), minStock: Number(updated.minStock) });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ─── RECETAS (Had-06) ─────────────────────────────────────────────────────────

// Obtener todos los ingredientes de un plato
export async function getRecipe(req: Request, res: Response): Promise<void> {
  try {
    const menuItemId = req.params['id'] as string;
    const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId }, select: { id: true, name: true } });
    if (!menuItem) {
      res.status(404).json({ error: 'Plato no encontrado' });
      return;
    }
    const recipe = await db.recipeItem.findMany({
      where: { menuItemId },
      include: { supply: { select: { id: true, name: true, unit: true, currentStock: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      ingredients: (recipe as any[]).map((r) => ({
        id: r.id,
        supplyId: r.supplyId,
        supplyName: r.supply.name,
        unit: r.supply.unit,
        quantity: Number(r.quantity),
        currentStock: Number(r.supply.currentStock),
      })),
    });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Reemplaza completamente la receta de un plato
// Body: [{ supplyId, quantity }]
const setRecipeSchema = z.array(
  z.object({
    supplyId: z.string().min(1),
    quantity: z.number().positive(),
  }),
);

export async function setRecipe(req: Request, res: Response): Promise<void> {
  try {
    const menuItemId = req.params['id'] as string;
    const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!menuItem) {
      res.status(404).json({ error: 'Plato no encontrado' });
      return;
    }
    const result = setRecipeSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }

    // Validar que todos los insumos existan
    const supplyIds = result.data.map((r) => r.supplyId);
    if (supplyIds.length > 0) {
      const found = await db.supply.count({ where: { id: { in: supplyIds } } });
      if (found !== supplyIds.length) {
        res.status(400).json({ error: 'Uno o más insumos no existen' });
        return;
      }
    }

    // Reemplazar receta en transacción
    await prisma.$transaction(async (tx: any) => {
      await tx.recipeItem.deleteMany({ where: { menuItemId } });
      if (result.data.length > 0) {
        await tx.recipeItem.createMany({
          data: result.data.map((r) => ({
            menuItemId,
            supplyId: r.supplyId,
            quantity: r.quantity,
          })),
        });
      }
    });

    // Re-evaluar disponibilidad del plato
    const changed = await syncMenuItemAvailability(menuItemId);
    if (changed) broadcastMenuUpdate();

    const recipe = await db.recipeItem.findMany({
      where: { menuItemId },
      include: { supply: { select: { id: true, name: true, unit: true, currentStock: true } } },
    });
    res.json(
      (recipe as any[]).map((r) => ({
        id: r.id,
        supplyId: r.supplyId,
        supplyName: r.supply.name,
        unit: r.supply.unit,
        quantity: Number(r.quantity),
        currentStock: Number(r.supply.currentStock),
      })),
    );
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Elimina un ingrediente de la receta de un plato
export async function removeRecipeItem(req: Request, res: Response): Promise<void> {
  try {
    const menuItemId = req.params['id'] as string;
    const supplyId = req.params['supplyId'] as string;

    const existing = await db.recipeItem.findUnique({
      where: { menuItemId_supplyId: { menuItemId, supplyId } },
    });
    if (!existing) {
      res.status(404).json({ error: 'El ingrediente no está en la receta de este plato' });
      return;
    }

    await db.recipeItem.delete({
      where: { menuItemId_supplyId: { menuItemId, supplyId } },
    });

    const changed = await syncMenuItemAvailability(menuItemId);
    if (changed) broadcastMenuUpdate();

    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// -NUEVOv5
