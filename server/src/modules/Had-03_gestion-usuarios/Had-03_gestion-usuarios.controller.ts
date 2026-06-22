import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';

// ─── SCHEMAS ──────────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  fullName: z.string().min(2).max(100),
  username: z.string().min(3).max(50),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['MESERO', 'COCINERO']),
});

const updateUserSchema = z
  .object({
    fullName: z.string().min(2).max(100).optional(),
    username: z.string().min(3).max(50).optional(),
    password: z.string().min(6).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Se requiere al menos un campo a actualizar',
  });

const setStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

// ─── HANDLERS ─────────────────────────────────────────────────────────────────

// GET /api/users
// Returns all MESERO and COCINERO users (never ADMIN, never passwordHash)
export async function listUsers(_req: Request, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['MESERO', 'COCINERO'] } },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ role: 'asc' }, { username: 'asc' }],
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv3

// POST /api/users
// Body: { fullName, username, password, role: 'MESERO' | 'COCINERO' }
export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }
    const { fullName, username, password, role } = result.data;

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { fullName, username, passwordHash, role, status: 'ACTIVE' },
      select: { id: true, fullName: true, username: true, role: true, status: true, createdAt: true },
    });

    res.status(201).json(user);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ error: 'El nombre de usuario ya existe' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv3

// PATCH /api/users/:id
// Body: { fullName?, username?, password? } — at least one required
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;

    // Cannot edit own account details via this endpoint (use dedicated profile endpoint if needed)
    const result = updateUserSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }
    const { fullName, username, password } = result.data;

    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined) updateData['fullName'] = fullName;
    if (username !== undefined) updateData['username'] = username;
    if (password !== undefined) updateData['passwordHash'] = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, fullName: true, username: true, role: true, status: true, updatedAt: true },
    });

    res.json(user);
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    if (err?.code === 'P2002') {
      res.status(409).json({ error: 'El nombre de usuario ya existe' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv3

// PATCH /api/users/:id/status
// Body: { status: 'ACTIVE' | 'INACTIVE' }
// Cannot disable own account (criterion 6)
export async function setUserStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;

    if (id === req.user!.userId) {
      res.status(403).json({ error: 'No puedes deshabilitar tu propia cuenta' });
      return;
    }

    const result = setStatusSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }
    const { status } = result.data;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    if (target.role === 'ADMIN') {
      res.status(403).json({ error: 'No se puede cambiar el estado de una cuenta ADMIN' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, fullName: true, username: true, role: true, status: true, updatedAt: true },
    });

    res.json(user);
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
} // -NUEVOv3
