import { z } from 'zod';

export const taskStatusEnum = z.enum([
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'OVERDUE',
]);

export const taskPriorityEnum = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
  priority: taskPriorityEnum.default('MEDIUM'),
  status: taskStatusEnum.default('TODO'),
  dueDate: z.coerce.date({ message: 'Valid due date is required' }),
  projectId: z.string().trim().min(1, 'Project ID is required'),
  assigneeId: z.string().trim().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters').optional(),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
  priority: taskPriorityEnum.optional(),
  status: taskStatusEnum.optional(),
  dueDate: z.coerce.date().optional(),
  assigneeId: z.string().trim().optional().nullable(),
  projectId: z.string().trim().optional(),
});

export const updateTaskStatusSchema = z.object({
  status: taskStatusEnum,
});

export const taskIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Task ID is required'),
});

export const taskQuerySchema = z.object({
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
  isOverdue: z.coerce.boolean().optional(),
  projectId: z.string().trim().optional(),
  assigneeId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['dueDate', 'priority', 'createdAt', 'status', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type TaskIdParam = z.infer<typeof taskIdParamSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
