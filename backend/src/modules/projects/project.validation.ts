import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(100, 'Project name cannot exceed 100 characters'),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
  clientId: z.string().trim().optional().nullable(),
});

export const updateProjectSchema = z.object({
    name: z.string().trim().min(1, 'Project name cannot be empty').max(100, 'Project name cannot exceed 100 characters').optional(),
    description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
    clientId: z.string().trim().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const projectIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Project ID is required'),
});

export const projectQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(['createdAt', 'name', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;
