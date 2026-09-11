import { Router } from 'express';
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from './task.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskIdParamSchema,
  taskQuerySchema,
} from './task.validation.js';

const router = Router();

// All task endpoints require authentication
router.use(authenticate);

// List tasks with filtering (status, priority, dates, overdue, search, pagination)
router.get('/', validate({ query: taskQuerySchema }), getAllTasks);

// Create task (Admin and PM only)
router.post(
  '/',
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ body: createTaskSchema }),
  createTask
);

// Get single task by ID
router.get('/:id', validate({ params: taskIdParamSchema }), getTaskById);

// Update task details (Admins, PMs for own project; Developers blocked if editing non-status fields)
router.patch(
  '/:id',
  validate({ params: taskIdParamSchema, body: updateTaskSchema }),
  updateTask
);

// Dedicated status update endpoint (Available to assigned Developers, PMs, Admins)
router.patch(
  '/:id/status',
  validate({ params: taskIdParamSchema, body: updateTaskStatusSchema }),
  updateTaskStatus
);

// Delete task (Admin and owning PM only)
router.delete(
  '/:id',
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: taskIdParamSchema }),
  deleteTask
);

export default router;
