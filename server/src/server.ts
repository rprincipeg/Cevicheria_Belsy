import { createServer } from 'http';
import { Server } from 'socket.io';
import { prisma } from './lib/prisma';
import app from './app';
import { initSocket } from './services/socket.service';
import { startKitchenJob } from './controllers/kitchen.controller';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true },
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
