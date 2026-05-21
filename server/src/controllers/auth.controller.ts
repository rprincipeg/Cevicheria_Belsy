import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const { username, password } = result.data;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.status === 'INACTIVE') {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }

    if (user.role === 'ADMIN') {
      res.status(403).json({ error: 'El panel de administrador no está disponible aún' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '30m' },
    );

    res.json({ token, role: user.role, username: user.username });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'Sesión cerrada' });
}
