import { createServer } from 'http';
import { Server } from 'socket.io';
import { prisma } from './lib/prisma';
import app from './app';
import { initSocket } from './shared/services/socket.service';
import { startKitchenJob } from './modules/HCoc-01_gestion-cocina/HCoc-01_gestion-cocina.controller';
import { isAllowedOrigin } from './shared/config/cors';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: true,
  },
});

initSocket(io);

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  socket.on('join:room', (room: string) => {
    socket.join(room);
    console.log(`[socket] ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

const PORT = Number(process.env.PORT ?? 3001);

httpServer.listen(PORT, async () => {
  await prisma.$connect();
  startKitchenJob();
  console.log(`[server] running on http://localhost:${PORT}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
