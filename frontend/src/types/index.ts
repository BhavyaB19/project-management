export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'OVERDUE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  clientId: string | null;
  owner?: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
  };
  tasks?: Task[];
  _count?: {
    tasks?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  taskNumber: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  projectId: string;
  assigneeId: string | null;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    ownerId: string;
  };
  assignee?: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
  } | null;
  activities?: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  taskId: string;
  taskNumber: number;
  taskTitle: string;
  projectId: string;
  projectName?: string;
  userId: string;
  userName: string;
  userRole?: Role;
  action: 'CREATED' | 'STATUS_CHANGE' | 'ASSIGNED' | 'OVERDUE' | string;
  details?: {
    from?: TaskStatus;
    to?: TaskStatus;
    title?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    [key: string]: any;
  } | null;
  formattedMessage: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  taskId?: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface TaskFilterParams {
  status?: TaskStatus | 'ALL' | '';
  priority?: TaskPriority | 'ALL' | '';
  isOverdue?: boolean;
  dueDateFrom?: string;
  dueDateTo?: string;
  projectId?: string;
  assigneeId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ProjectFilterParams {
  search?: string;
  clientId?: string;
  page?: number;
  limit?: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  clientId?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  clientId?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority: TaskPriority;
  status?: TaskStatus;
  dueDate: string;
  projectId: string;
  assigneeId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  assigneeId?: string;
}

export interface PresencePayload {
  onlineCount: number;
}

export interface SocketActivityPayload {
  id?: string;
  taskId: string;
  taskNumber: number;
  taskTitle: string;
  projectId: string;
  projectName?: string;
  userId: string;
  userName: string;
  action: string;
  details?: any;
  formattedMessage: string;
  createdAt: string;
}
