import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type {
  ApiResponse,
  AuthResponse,
  User,
  Project,
  Task,
  ActivityLog,
  PaginationMeta,
  TaskFilterParams,
  ProjectFilterParams,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  Role,
} from '../types/index.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create central Axios instance with credential support for HttpOnly refresh cookie
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Access token helpers (persisted in memory / localStorage fallback)
export const getStoredToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const setStoredToken = (token: string | null, remember = true) => {
  if (token) {
    if (remember) {
      localStorage.setItem('token', token);
    } else {
      sessionStorage.setItem('token', token);
    }
  } else {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// Request Interceptor: Attach Bearer Access Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Automatically refresh access token on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Avoid retry loops for auth endpoints or if already retried
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Refresh token is transported automatically via HttpOnly cookie
      const { data } = await axios.post<ApiResponse<{ accessToken: string }>>(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const newAccessToken = data.data?.accessToken;
      if (newAccessToken) {
        setStoredToken(newAccessToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        processQueue(null, newAccessToken);
        return api(originalRequest);
      } else {
        throw new Error('No access token returned from refresh endpoint');
      }
    } catch (refreshErr) {
      processQueue(refreshErr as Error, null);
      setStoredToken(null);
      // Dispatch event or let app redirect
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

// ==========================================
// Typed API Endpoints
// ==========================================

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: {
    email: string;
    password: string;
    name: string;
    role: Role;
  }) => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post<ApiResponse<null>>('/auth/logout');
    setStoredToken(null);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
    return response.data;
  },
};

export const projectsApi = {
  getAll: async (params?: ProjectFilterParams) => {
    const response = await api.get<ApiResponse<{ projects: Project[]; meta: PaginationMeta }>>(
      '/projects',
      { params }
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<{ project: Project }>>(`/projects/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectInput) => {
    const response = await api.post<ApiResponse<{ project: Project }>>('/projects', data);
    return response.data;
  },

  update: async (id: string, data: UpdateProjectInput) => {
    const response = await api.patch<ApiResponse<{ project: Project }>>(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/projects/${id}`);
    return response.data;
  },
};

export const tasksApi = {
  getAll: async (params?: TaskFilterParams) => {
    // Clean empty string filters
    const cleanParams = Object.entries(params || {}).reduce((acc, [key, value]) => {
      if (value !== '' && value !== 'ALL' && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    const response = await api.get<ApiResponse<{ tasks: Task[]; meta: PaginationMeta }>>('/tasks', {
      params: cleanParams,
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<{ task: Task }>>(`/tasks/${id}`);
    return response.data;
  },

  create: async (data: CreateTaskInput) => {
    const response = await api.post<ApiResponse<{ task: Task }>>('/tasks', data);
    return response.data;
  },

  update: async (id: string, data: UpdateTaskInput) => {
    const response = await api.patch<ApiResponse<{ task: Task }>>(`/tasks/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: TaskStatus) => {
    const response = await api.patch<ApiResponse<{ task: Task }>>(`/tasks/${id}/status`, { status });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/tasks/${id}`);
    return response.data;
  },
};

export const activityApi = {
  getRecent: async (params?: { page?: number; limit?: number; projectId?: string; taskId?: string }) => {
    const response = await api.get<ApiResponse<{ activities: ActivityLog[]; meta: PaginationMeta }>>(
      '/activity',
      { params }
    );
    return response.data;
  },
};
