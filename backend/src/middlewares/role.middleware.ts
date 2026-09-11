import type { Request, Response, NextFunction } from 'express';
import type { Role } from '../config/prisma.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('User is not authenticated');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};
