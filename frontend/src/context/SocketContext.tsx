import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.tsx';
import type { PresencePayload, SocketActivityPayload } from '../types/index.ts';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineCount: number;
  liveActivities: SocketActivityPayload[];
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  clearLiveActivities: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [liveActivities, setLiveActivities] = useState<SocketActivityPayload[]>([]);
  const joinedProjectsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Initialize socket connection with JWT Bearer handshake auth
    const socketClient = io(WS_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socketClient.on('connect', () => {
      setIsConnected(true);
      console.log('[Socket] Connected with ID:', socketClient.id);

      // Re-join any previously subscribed project rooms upon reconnect
      joinedProjectsRef.current.forEach((projectId) => {
        socketClient.emit('join:project', projectId);
      });
    });

    socketClient.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('[Socket] Disconnected:', reason);
    });

    socketClient.on('connect_error', (error) => {
      console.warn('[Socket] Connection error:', error.message);
      setIsConnected(false);
    });

    // Admin presence count updates
    socketClient.on('presence:count', (data: PresencePayload) => {
      if (typeof data?.onlineCount === 'number') {
        setOnlineCount(data.onlineCount);
      }
    });

    // Real-time activity stream events
    socketClient.on('activity:feed', (activity: SocketActivityPayload) => {
      setLiveActivities((prev) => [activity, ...prev.slice(0, 49)]);
    });

    setSocket(socketClient);

    return () => {
      socketClient.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [token, user]);

  const joinProject = useCallback(
    (projectId: string) => {
      if (!projectId) return;
      joinedProjectsRef.current.add(projectId);
      if (socket && socket.connected) {
        socket.emit('join:project', projectId);
      }
    },
    [socket]
  );

  const leaveProject = useCallback(
    (projectId: string) => {
      if (!projectId) return;
      joinedProjectsRef.current.delete(projectId);
      if (socket && socket.connected) {
        socket.emit('leave:project', projectId);
      }
    },
    [socket]
  );

  const clearLiveActivities = useCallback(() => {
    setLiveActivities([]);
  }, []);

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineCount,
    liveActivities,
    joinProject,
    leaveProject,
    clearLiveActivities,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
