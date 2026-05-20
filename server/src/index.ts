import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { prisma } from "./lib/prisma";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL ?? "http://localhost:5173", credentials: true },
});

app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:5173", credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

io.on("connection", (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);
  socket.on("disconnect", () => console.log(`[socket] client disconnected: ${socket.id}`));
});

const PORT = Number(process.env.PORT ?? 3001);

httpServer.listen(PORT, async () => {
  await prisma.$connect();
  console.log(`[server] running on http://localhost:${PORT}`);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
