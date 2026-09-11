import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred. Please try again later.';
  let details: any = undefined;

  // Custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }
  // Prisma Unique Constraint Error
  else if (err?.code === 'P2002') {
    statusCode = 409;
    code = 'CONFLICT';
    const targets = err.meta?.target || ['resource'];
    message = `A record with the given ${Array.isArray(targets) ? targets.join(', ') : targets} already exists.`;
  }
  // Prisma Record Not Found
  else if (err?.code === 'P2025') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Requested record was not found.';
  }
  // JWT Errors
  else if (err?.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid authentication token.';
  } else if (err?.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Authentication token has expired.';
  }
  // Syntax error (e.g. invalid JSON payload)
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    code = 'BAD_REQUEST';
    message = 'Malformed JSON in request body.';
  }

  // Log unexpected errors on server
  if (statusCode === 500) {
    console.error('Unhandled Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(env.NODE_ENV === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
    },
  });
};
