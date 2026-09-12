import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../config/redis.js';
import { OVERDUE_TASK_QUEUE_NAME } from './overdueTask.queue.js';
import { prisma } from '../config/prisma.js';
import { socketEmitter } from '../websockets/socket.emitter.js';

export const initOverdueTaskWorker = () => {
  const worker = new Worker(
    OVERDUE_TASK_QUEUE_NAME,
    async (job: Job) => {
      try {
        const now = new Date();

        // Query tasks past their due date that are not yet marked as DONE or OVERDUE
        const overdueTasks = await prisma.task.findMany({
          where: {
            dueDate: { lt: now },
            status: { notIn: ['DONE', 'OVERDUE'] },
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
              },
            },
          },
        });

        if (overdueTasks.length === 0) {
          return { processed: 0 };
        }

        console.log(`[BullMQ Worker] Found ${overdueTasks.length} overdue tasks to update`);

        for (const task of overdueTasks) {
          // Update status to OVERDUE
          await prisma.task.update({
            where: { id: task.id },
            data: { status: 'OVERDUE' },
          });

          // Create database-stored ActivityLog record
          const log = await prisma.activityLog.create({
            data: {
              taskId: task.id,
              userId: task.project.ownerId, // Attributed to system / project owner
              action: 'OVERDUE',
              details: {
                from: task.status,
                to: 'OVERDUE',
                taskNumber: task.taskNumber,
                title: task.title,
              },
            },
          });

          // Broadcast real-time event to project viewers and role feeds
          socketEmitter.emitActivityEvent({
            activityId: log.id,
            taskId: task.id,
            taskNumber: task.taskNumber,
            taskTitle: task.title,
            projectId: task.projectId,
            projectName: task.project.name,
            projectOwnerId: task.project.ownerId,
            assigneeId: task.assigneeId,
            userId: task.project.ownerId,
            userName: 'System',
            action: 'OVERDUE',
            details: {
              from: task.status,
              to: 'OVERDUE',
            },
            createdAt: log.createdAt,
          });
        }

        return { processed: overdueTasks.length };
      } catch (error) {
        console.error('[BullMQ Worker] Error processing overdue tasks:', error);
        throw error;
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: 1,
    }
  );

  worker.on('error', (err) => {
    console.warn('[BullMQ Worker] Redis connection warning (worker waiting for Redis):', err.message);
  });

  worker.on('completed', (job) => {
    console.log(`[BullMQ Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker] Job ${job?.id} failed with error:`, err);
  });

  return worker;
};
