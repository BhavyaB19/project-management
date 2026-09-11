import { z } from 'zod';

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  page: z.coerce.number().int().positive().default(1),
  projectId: z.string().trim().optional(),
  taskId: z.string().trim().optional(),
});

export type ActivityQueryInput = z.infer<typeof activityQuerySchema>;
