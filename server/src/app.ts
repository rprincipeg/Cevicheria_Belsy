import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';

import authRoutes from './modules/US-01_acceso-por-rol/US-01_acceso-por-rol.routes';
import tablesRoutes from './modules/Hme-01_mapa-mesas/Hme-01_mapa-mesas.routes';
import menuRoutes from './modules/Had-02_administracion-menu/Had-02_administracion-menu.routes';
import ordersRoutes from './modules/Hme-02_visualizar-platos/Hme-02_visualizar-platos.routes';
import kitchenRoutes from './modules/HCoc-01_gestion-cocina/HCoc-01_gestion-cocina.routes';
import paymentRoutes from './modules/Had-01_cobro-mesas/Had-01_cobro-mesas.routes';
import usersRoutes from './modules/Had-03_gestion-usuarios/Had-03_gestion-usuarios.routes';         // Had-03
import reportsRoutes from './modules/Had-04_reportes-ventas/Had-04_reportes-ventas.routes';   // Had-04
import { isAllowedOrigin } from './shared/config/cors';
import { UPLOADS_DIR } from './shared/config/storage';

const app = express();

app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', usersRoutes);         // Had-03 -EDITADOv3
app.use('/api/reports', reportsRoutes);     // Had-04 -EDITADOv3

// Serve uploaded images (Had-02)
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve frontend static files
const clientRoot = path.join(__dirname, '..', '..', 'client');
app.use(express.static(clientRoot));
app.get('/', (_req, res) => res.redirect('/Login/acceso-por-rol.html'));

export default app;

// -EDITADOv2 (added /uploads static serving for Had-02) -EDITADOv6
