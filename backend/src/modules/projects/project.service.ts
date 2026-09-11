import { prisma } from '../../config/prisma.js';
import type { JwtUserPayload } from '../../utils/jwt.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectQueryInput,
} from './project.validation.js';
import type { Prisma } from '../../config/prisma.js';

export class ProjectService {
  /**
   * Create a new project.
   * PMs are set as the owner automatically.
   */
  async createProject(input: CreateProjectInput, user: JwtUserPayload) {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        clientId: input.clientId ?? null,
        ownerId: user.userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return project;
  }

  /**
   * List projects with role-based scoping, search, sorting, and pagination:
   * - ADMIN: sees all projects
   * - PM: sees only projects they created
   * - DEVELOPER: sees only projects containing tasks assigned to them
   */
  async getAllProjects(query: ProjectQueryInput, user: JwtUserPayload) {
    const { search, page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {};

    // Role-based visibility scoping
    if (user.role === 'PROJECT_MANAGER') {
      where.ownerId = user.userId;
    } else if (user.role === 'DEVELOPER') {
      where.tasks = {
        some: {
          assigneeId: user.userId,
        },
      };
    }

    // Search filter across project name and description
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      projects,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single project by ID with strict ownership/access check.
   */
  async getProjectById(id: string, user: JwtUserPayload) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        tasks: {
          select: {
            id: true,
            taskNumber: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Role-based access validation
    if (user.role === 'PROJECT_MANAGER' && project.ownerId !== user.userId) {
      throw new ForbiddenError('You do not have permission to view this project');
    }

    if (user.role === 'DEVELOPER') {
      const hasAssignedTask = project.tasks.some(
        (task) => task.assignee?.id === user.userId
      );
      if (!hasAssignedTask) {
        throw new ForbiddenError('You do not have access to this project');
      }
    }

    return project;
  }

  /**
   * Update project details. Only Admins or the owning PM can update.
   */
  async updateProject(id: string, input: UpdateProjectInput, user: JwtUserPayload) {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (user.role === 'PROJECT_MANAGER' && project.ownerId !== user.userId) {
      throw new ForbiddenError('You can only update projects you created');
    }

    if (user.role === 'DEVELOPER') {
      throw new ForbiddenError('Developers cannot update projects');
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.clientId !== undefined && { clientId: input.clientId }),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedProject;
  }

  /**
   * Delete project. Only Admins or the owning PM can delete.
   */
  async deleteProject(id: string, user: JwtUserPayload) {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (user.role === 'PROJECT_MANAGER' && project.ownerId !== user.userId) {
      throw new ForbiddenError('You can only delete projects you created');
    }

    if (user.role === 'DEVELOPER') {
      throw new ForbiddenError('Developers cannot delete projects');
    }

    await prisma.project.delete({
      where: { id },
    });

    return { message: 'Project deleted successfully' };
  }
}

export const projectService = new ProjectService(); 