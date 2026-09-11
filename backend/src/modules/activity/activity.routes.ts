import { Router } from 'express';
import { getRecentActivities } from './activity.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { activityQuerySchema } from './activity.validation.js';

const router = Router();

// All activity routes require authentication
router.use(authenticate);

// GET /api/activity (Last 20 activity events, role-filtered, DB-backed offline catch-up)
router.get('/', validate({ query: activityQuerySchema }), getRecentActivities);

export default router;
