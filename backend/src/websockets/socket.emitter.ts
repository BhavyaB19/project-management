import { getIO } from './socket.server.js';
import { activityService } from '../modules/activity/activity.service.js';

export interface ActivityBroadcastPayload {
  activityId?: string;
  taskId: string;
  taskNumber: number;
  taskTitle: string;
  projectId: string;
  projectName?: string;
  projectOwnerId?: string;
  assigneeId?: string | null;
  userId: string;
  userName: string;
  action: string;
  details?: any;
  createdAt?: Date;
}

export class SocketEmitter {
  /**
   * Broadcasts real-time activity events to appropriate role rooms and project viewers.
   */
  emitActivityEvent(payload: ActivityBroadcastPayload) {
    try {
      const io = getIO();
      const formattedMessage = activityService.formatActivityMessage(
        payload.userName,
        payload.action,
        payload.taskNumber,
        payload.taskTitle,
        payload.details
      );

      const eventData = {
        id: payload.activityId,
        taskId: payload.taskId,
        taskNumber: payload.taskNumber,
        taskTitle: payload.taskTitle,
        projectId: payload.projectId,
        projectName: payload.projectName,
        userId: payload.userId,
        userName: payload.userName,
        action: payload.action,
        details: payload.details,
        formattedMessage,
        createdAt: (payload.createdAt || new Date()).toISOString(),
      };

      // 1. Project Room: All users currently viewing this project board (live board update without refresh)
      io.to(`project:${payload.projectId}`).emit('activity:feed', eventData);
      io.to(`project:${payload.projectId}`).emit('task:updated', eventData);

      // 2. Admin: Admin sees activity across all projects globally + live board update
      io.to('admin-feed').emit('activity:feed', eventData);
      io.to('admin-feed').emit('task:updated', eventData);

      // 3. PM: PM sees activity only from their own projects + live board update
      if (payload.projectOwnerId) {
        io.to(`pm-feed:${payload.projectOwnerId}`).emit('activity:feed', eventData);
        io.to(`pm-feed:${payload.projectOwnerId}`).emit('task:updated', eventData);
      }

      // 4. Developer: Developer sees activity only on tasks assigned to them + live board update
      if (payload.assigneeId) {
        io.to(`user:${payload.assigneeId}`).emit('activity:feed', eventData);
        io.to(`user:${payload.assigneeId}`).emit('task:updated', eventData);
      }
    } catch (err) {
      // Avoid failing database transactions if socket server is starting or disconnected
      console.error('[SocketEmitter] Failed to emit activity event:', err);
    }
  }
}

export const socketEmitter = new SocketEmitter();
