import { Router } from 'express';
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from './project.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
  projectQuerySchema,
} from './project.validation.js';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// List projects (Admin: all, PM: owned, Developer: assigned projects)
router.get('/', validate({ query: projectQuerySchema }), getAllProjects);

// Create project (Admin and PM only)
router.post(
  '/',
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ body: createProjectSchema }),
  createProject
);

// Get single project
router.get('/:id', validate({ params: projectIdParamSchema }), getProjectById);

// Update project (Admin and owning PM only)
router.patch(
  '/:id',
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: projectIdParamSchema, body: updateProjectSchema }),
  updateProject
);

// Delete project (Admin and owning PM only)
router.delete(
  '/:id',
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: projectIdParamSchema }),
  deleteProject
);

export default router;
