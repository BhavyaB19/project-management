import type { Request, Response, NextFunction } from 'express';
import { activityService } from './activity.service.js';
import { sendSuccess, UnauthorizedError } from '../../utils/errors.js';
import type { ActivityQueryInput } from './activity.validation.js';

export const getRecentActivities = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const result = await activityService.getRecentActivities(
      req.query as unknown as ActivityQueryInput,
      req.user
    );

    return sendSuccess(res, result, 'Activity feed retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};
