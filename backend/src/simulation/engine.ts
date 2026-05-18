import { Server } from 'socket.io';
export function startSimulation(io: Server, speedMultiplier = 1) {
  io.emit('simulation:started', { speedMultiplier, startedAt: new Date().toISOString() });
}
