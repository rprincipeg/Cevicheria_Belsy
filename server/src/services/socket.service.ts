import { Server } from 'socket.io';

let _io: Server | null = null;

export function initSocket(io: Server): void {
  _io = io;
}

export function getIo(): Server {
  if (!_io) throw new Error('[socket] Socket.io not initialized');
  return _io;
}
