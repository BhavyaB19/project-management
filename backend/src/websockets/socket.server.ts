import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { verifyAccessToken, type JwtUserPayload } from '../utils/jwt.js';
import { presenceManager } from './presence.js';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: JwtUserPayload;
  };
}

let ioInstance: Server | null = null;

export const getIO = (): Server => {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return ioInstance;
};

export const initSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Handshake JWT Authentication Middleware
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.headers.authorization;
      const authToken = socket.handshake.auth?.token;

      let token: string | undefined;

      if (authToken) {
        token = authToken.startsWith('Bearer ') ? authToken.slice(7) : authToken;
      } else if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch (err: any) {
      return next(new Error('Authentication failed: Invalid or expired token'));
    }
  });

  // Connection Handler
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const user = authSocket.data.user;

    // Track online presence
    presenceManager.addUser(user.userId, io);

    // Auto-join personal room for direct notifications
    authSocket.join(`user:${user.userId}`);

    // Role-specific room assignments
    if (user.role === 'ADMIN') {
      authSocket.join('admin-feed');
      // Send immediate presence count upon connecting to Admin
      authSocket.emit('presence:count', {
        onlineCount: presenceManager.getOnlineCount(),
      });
    } else if (user.role === 'PROJECT_MANAGER') {
      authSocket.join(`pm-feed:${user.userId}`);
    }

    // Client requests to view a specific project board in real-time
    authSocket.on('join:project', (projectId: string) => {
      if (projectId && typeof projectId === 'string') {
        authSocket.join(`project:${projectId}`);
      }
    });

    // Client leaves project board
    authSocket.on('leave:project', (projectId: string) => {
      if (projectId && typeof projectId === 'string') {
        authSocket.leave(`project:${projectId}`);
      }
    });

    authSocket.on('disconnect', () => {
      presenceManager.removeUser(user.userId, io);
    });
  });

  ioInstance = io;
  return io;
};
