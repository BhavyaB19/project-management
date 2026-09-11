import type { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service.js';
import { sendSuccess, UnauthorizedError } from '../../utils/errors.js';
import type { ProjectQueryInput } from './project.validation.js';

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const project = await projectService.createProject(req.body, req.user);
    return sendSuccess(res, project, 'Project created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getAllProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const result = await projectService.getAllProjects(
      req.query as unknown as ProjectQueryInput,
      req.user
    );
    return sendSuccess(res, result, 'Projects retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const project = await projectService.getProjectById(req.params.id as string, req.user);
    return sendSuccess(res, project, 'Project retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const project = await projectService.updateProject(
      req.params.id as string,
      req.body,
      req.user
    );
    return sendSuccess(res, project, 'Project updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const result = await projectService.deleteProject(req.params.id as string, req.user);
    return sendSuccess(res, result, 'Project deleted successfully', 200);
  } catch (error) {
    next(error);
  }
};
