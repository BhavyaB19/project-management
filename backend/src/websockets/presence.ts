import type { Server } from 'socket.io';

class PresenceManager {
  // Map of userId -> count of open socket connections
  private activeUsers = new Map<string, number>();

  addUser(userId: string, io?: Server): void {
    const current = this.activeUsers.get(userId) || 0;
    this.activeUsers.set(userId, current + 1);

    if (current === 0 && io) {
      this.broadcastPresence(io);
    }
  }

  removeUser(userId: string, io?: Server): void {
    const current = this.activeUsers.get(userId) || 0;
    if (current <= 1) {
      this.activeUsers.delete(userId);
      if (io) {
        this.broadcastPresence(io);
      }
    } else {
      this.activeUsers.set(userId, current - 1);
    }
  }

  getOnlineCount(): number {
    return this.activeUsers.size;
  }

  isUserOnline(userId: string): boolean {
    return this.activeUsers.has(userId);
  }

  broadcastPresence(io: Server): void {
    const count = this.getOnlineCount();
    // Admin dashboard presence requirement: live count using WebSocket presence
    io.to('admin-feed').emit('presence:count', { onlineCount: count });
  }
}

export const presenceManager = new PresenceManager();
