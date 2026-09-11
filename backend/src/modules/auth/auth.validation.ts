import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(100, 'Password cannot exceed 100 characters'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER']).default('DEVELOPER'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
