import { prisma } from '../../config/prisma.js';
import type { JwtUserPayload } from '../../utils/jwt.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  TaskQueryInput,
} from './task.validation.js';
import type { Prisma, TaskStatus } from '../../config/prisma.js';

export class TaskService {
  /**
   * Create a new task.
   * Admins and PMs can create tasks. PMs can only create inside their own projects.
   */
  async createTask(input: CreateTaskInput, user: JwtUserPayload) {
    if (user.role === 'DEVELOPER') {
      throw new ForbiddenError('Developers cannot create tasks');
    }

    // Verify project exists and check PM ownership
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (user.role === 'PROJECT_MANAGER' && project.ownerId !== user.userId) {
      throw new ForbiddenError('You can only create tasks in your own projects');
    }

    // Validate assignee if provided
    if (input.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: input.assigneeId },
      });

      if (!assignee) {
        throw new NotFoundError('Assignee user not found');
      }
    }

    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        status: input.status,
        dueDate: input.dueDate,
        projectId: input.projectId,
        assigneeId: input.assigneeId ?? null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Record creation in ActivityLog
    await prisma.activityLog.create({
      data: {
        taskId: task.id,
        userId: user.userId,
        action: 'CREATED',
        details: {
          title: task.title,
          status: task.status,
          priority: task.priority,
          taskNumber: task.taskNumber,
        },
      },
    });

    return task;
  }

  /**
   * List tasks with role-based scoping, multi-criteria filters, search, and pagination:
   * - ADMIN: sees all tasks across all projects
   * - PM: sees only tasks within projects they own
   * - DEVELOPER: sees only tasks assigned directly to them
   */
  async getAllTasks(query: TaskQueryInput, user: JwtUserPayload) {
    const {
      status,
      priority,
      dueDateFrom,
      dueDateTo,
      isOverdue,
      projectId,
      assigneeId,
      search,
      sortBy,
      sortOrder,
      page,
      limit,
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.TaskWhereInput = {};

    // Strict Role-Based Visibility Scoping
    if (user.role === 'DEVELOPER') {
      where.assigneeId = user.userId;
    } else if (user.role === 'PROJECT_MANAGER') {
      where.project = {
        ownerId: user.userId,
      };
    }

    // Filter by project
    if (projectId) {
      where.projectId = projectId;
    }

    // Filter by assignee (Admin & PM only; Developer is locked to own userId)
    if (assigneeId && user.role !== 'DEVELOPER') {
      where.assigneeId = assigneeId;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by priority
    if (priority) {
      where.priority = priority;
    }

    // Overdue Filter
    if (isOverdue) {
      where.OR = [
        { status: 'OVERDUE' },
        {
          status: { notIn: ['DONE', 'OVERDUE'] },
          dueDate: { lt: new Date() },
        },
      ];
    }

    // Date range filter
    if (dueDateFrom || dueDateTo) {
      where.dueDate = {
        ...(dueDateFrom && { gte: dueDateFrom }),
        ...(dueDateTo && { lte: dueDateTo }),
      };
    }

    // Search query on title and description
    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return {
      tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single task by ID with strict ownership/assignment access verification.
   */
  async getTaskById(id: string, user: JwtUserPayload) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        activities: {
          take: 10,
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
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // Role-based access validation
    if (user.role === 'DEVELOPER' && task.assigneeId !== user.userId) {
      throw new ForbiddenError('You do not have access to this task');
    }

    if (user.role === 'PROJECT_MANAGER' && task.project.ownerId !== user.userId) {
      throw new ForbiddenError('You do not have access to tasks in this project');
    }

    return task;
  }

  /**
   * Update task details.
   * - Developers can ONLY update the status field.
   * - PMs can update all fields for tasks in their own projects.
   * - Admins have full update rights.
   */
  async updateTask(id: string, input: UpdateTaskInput, user: JwtUserPayload) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // Developer restrictions: only status can be updated
    if (user.role === 'DEVELOPER') {
      if (task.assigneeId !== user.userId) {
        throw new ForbiddenError('You can only update tasks assigned to you');
      }

      const hasOtherFields =
        input.title !== undefined ||
        input.description !== undefined ||
        input.priority !== undefined ||
        input.dueDate !== undefined ||
        input.assigneeId !== undefined ||
        input.projectId !== undefined;

      if (hasOtherFields) {
        throw new ForbiddenError('Developers can only update task status');
      }
    }

    // PM restrictions: only within owned projects
    if (user.role === 'PROJECT_MANAGER' && task.project.ownerId !== user.userId) {
      throw new ForbiddenError('You can only update tasks in projects you created');
    }

    // If changing assignee, verify the new assignee exists
    if (input.assigneeId) {
      const newAssignee = await prisma.user.findUnique({
        where: { id: input.assigneeId },
      });
      if (!newAssignee) {
        throw new NotFoundError('Assignee user not found');
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
        ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
        ...(input.projectId !== undefined && { projectId: input.projectId }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Record Activity Log on status change
    if (input.status && input.status !== task.status) {
      await prisma.activityLog.create({
        data: {
          taskId: task.id,
          userId: user.userId,
          action: 'STATUS_CHANGE',
          details: {
            from: task.status,
            to: input.status,
            taskNumber: task.taskNumber,
            title: task.title,
          },
        },
      });
    }

    // Record Activity Log on assignee change
    if (input.assigneeId !== undefined && input.assigneeId !== task.assigneeId) {
      await prisma.activityLog.create({
        data: {
          taskId: task.id,
          userId: user.userId,
          action: 'ASSIGNED',
          details: {
            from: task.assigneeId,
            to: input.assigneeId,
            taskNumber: task.taskNumber,
            title: task.title,
          },
        },
      });
    }

    return updatedTask;
  }

  /**
   * Dedicated method for status changes (used by Developers and drag-and-drop boards).
   */
  async updateTaskStatus(id: string, newStatus: TaskStatus, user: JwtUserPayload) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (user.role === 'DEVELOPER' && task.assigneeId !== user.userId) {
      throw new ForbiddenError('You can only update status on tasks assigned to you');
    }

    if (user.role === 'PROJECT_MANAGER' && task.project.ownerId !== user.userId) {
      throw new ForbiddenError('You can only update tasks in projects you created');
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status: newStatus },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Create database-stored ActivityLog entry
    await prisma.activityLog.create({
      data: {
        taskId: task.id,
        userId: user.userId,
        action: 'STATUS_CHANGE',
        details: {
          from: task.status,
          to: newStatus,
          taskNumber: task.taskNumber,
          title: task.title,
        },
      },
    });

    return updatedTask;
  }

  /**
   * Delete task. Only Admins and owning PMs can delete tasks.
   */
  async deleteTask(id: string, user: JwtUserPayload) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (user.role === 'DEVELOPER') {
      throw new ForbiddenError('Developers cannot delete tasks');
    }

    if (user.role === 'PROJECT_MANAGER' && task.project.ownerId !== user.userId) {
      throw new ForbiddenError('You can only delete tasks in projects you created');
    }

    await prisma.task.delete({
      where: { id },
    });

    return { message: 'Task deleted successfully' };
  }
}

export const taskService = new TaskService();
