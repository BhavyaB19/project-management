import type { Request, Response, NextFunction } from 'express';
import { taskService } from './task.service.js';
import { sendSuccess, UnauthorizedError } from '../../utils/errors.js';
import type { TaskQueryInput } from './task.validation.js';

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const task = await taskService.createTask(req.body, req.user);
    return sendSuccess(res, task, 'Task created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getAllTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const result = await taskService.getAllTasks(
      req.query as unknown as TaskQueryInput,
      req.user
    );
    return sendSuccess(res, result, 'Tasks retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const task = await taskService.getTaskById(req.params.id as string, req.user);
    return sendSuccess(res, task, 'Task retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const task = await taskService.updateTask(
      req.params.id as string,
      req.body,
      req.user
    );
    return sendSuccess(res, task, 'Task updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const task = await taskService.updateTaskStatus(
      req.params.id as string,
      req.body.status,
      req.user
    );
    return sendSuccess(res, task, 'Task status updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const result = await taskService.deleteTask(req.params.id as string, req.user);
    return sendSuccess(res, result, 'Task deleted successfully', 200);
  } catch (error) {
    next(error);
  }
};
