import { Request, Response, NextFunction } from 'express';

export type AppRole = 'MESERO' | 'COCINERO' | 'ADMIN';

export function authorize(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role as AppRole | undefined;
    if (!userRole) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    if (userRole === 'ADMIN' || roles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ error: 'No autorizado' });
    }
  };
}
