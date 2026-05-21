import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import tablesRoutes from './routes/tables.routes';
import menuRoutes from './routes/menu.routes';
import ordersRoutes from './routes/orders.routes';
import kitchenRoutes from './routes/kitchen.routes';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:3001', credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/kitchen', kitchenRoutes);

// Serve frontend static files
const clientRoot = path.join(__dirname, '..', '..', 'cevicheria_v2_propio_modified');
app.use(express.static(clientRoot));
app.get('/', (_req, res) => res.redirect('/Login/Login.html'));

export default app;
