import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../config/redis.js';

export const OVERDUE_TASK_QUEUE_NAME = 'overdue-tasks';

export const overdueTaskQueue = new Queue(OVERDUE_TASK_QUEUE_NAME, {
  connection: redisConnectionOptions,
});

export const initOverdueTaskScheduler = async () => {
  try {
    // Register a repeatable job scheduler that runs every 60 seconds
    await overdueTaskQueue.upsertJobScheduler(
      'repeatable-check-overdue-tasks',
      {
        every: 60 * 1000, // Every 60 seconds
      },
      {
        name: 'check-overdue-tasks',
        data: {},
        opts: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      }
    );
    console.log('[BullMQ] Overdue task scheduler initialized (repeat: 60s)');
  } catch (error) {
    console.error('[BullMQ] Failed to initialize overdue task scheduler:', error);
  }
};
