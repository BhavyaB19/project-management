import { prisma } from '../../config/prisma.js';
import type { JwtUserPayload } from '../../utils/jwt.js';
import type { ActivityQueryInput } from './activity.validation.js';
import type { Prisma } from '../../config/prisma.js';

export class ActivityService {
  /**
   * Helper to format human-friendly status names.
   * e.g. IN_PROGRESS -> In Progress, IN_REVIEW -> In Review
   */
  private formatStatusName(status?: string): string {
    if (!status) return '';
    const map: Record<string, string> = {
      TODO: 'To Do',
      IN_PROGRESS: 'In Progress',
      IN_REVIEW: 'In Review',
      DONE: 'Done',
      OVERDUE: 'Overdue',
    };
    return map[status] || status;
  }

  /**
   * Formats activity records according to assessment specification:
   * e.g., "Ravi moved Task #12 from In Progress -> In Review"
   */
  public formatActivityMessage(
    userName: string,
    action: string,
    taskNumber: number,
    taskTitle: string,
    details?: any
  ): string {
    const d = details || {};

    switch (action) {
      case 'STATUS_CHANGE': {
        const from = this.formatStatusName(d.from);
        const to = this.formatStatusName(d.to);
        return `${userName} moved Task #${taskNumber} from ${from} -> ${to}`;
      }
      case 'ASSIGNED': {
        return `${userName} assigned Task #${taskNumber} ("${taskTitle}")`;
      }
      case 'CREATED': {
        return `${userName} created Task #${taskNumber} ("${taskTitle}")`;
      }
      case 'OVERDUE': {
        return `Task #${taskNumber} was automatically flagged as Overdue`;
      }
      default:
        return `${userName} performed ${action} on Task #${taskNumber}`;
    }
  }

  /**
   * Fetches missed/historical activities from the PostgreSQL ActivityLog table.
   * Enforces strict role-based visibility:
   * - ADMIN: sees activity across all projects
   * - PM: sees activity only from projects they own
   * - DEVELOPER: sees activity only on tasks assigned to them
   */
  async getRecentActivities(query: ActivityQueryInput, user: JwtUserPayload) {
    const { limit, page, projectId, taskId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityLogWhereInput = {};
    const taskWhere: Prisma.TaskWhereInput = {};

    // Strict Role Scoping
    if (user.role === 'PROJECT_MANAGER') {
      taskWhere.project = {
        ownerId: user.userId,
      };
    } else if (user.role === 'DEVELOPER') {
      taskWhere.assigneeId = user.userId;
    }

    // Optional project and task filters
    if (projectId) {
      taskWhere.projectId = projectId;
    }

    if (Object.keys(taskWhere).length > 0) {
      where.task = taskWhere;
    }

    if (taskId) {
      where.taskId = taskId;
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          task: {
            select: {
              id: true,
              taskNumber: true,
              title: true,
              status: true,
              priority: true,
              projectId: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  ownerId: true,
                },
              },
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    // Attach human-readable formatted messages
    const activities = logs.map((log) => {
      const userName = log.user.name || log.user.email.split('@')[0];
      const taskNumber = log.task.taskNumber;
      const taskTitle = log.task.title;
      const formattedMessage = this.formatActivityMessage(
        userName,
        log.action,
        taskNumber,
        taskTitle,
        log.details
      );

      return {
        id: log.id,
        taskId: log.taskId,
        taskNumber,
        taskTitle,
        projectId: log.task.projectId,
        projectName: log.task.project.name,
        userId: log.userId,
        userName,
        userRole: log.user.role,
        action: log.action,
        details: log.details,
        formattedMessage,
        createdAt: log.createdAt,
      };
    });

    return {
      activities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const activityService = new ActivityService();
