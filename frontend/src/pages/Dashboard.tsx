import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../context/SocketContext.tsx';
import { projectsApi, tasksApi } from '../lib/api.ts';
import {
  Navbar,
  ActivityFeed,
  TaskFilters,
  TaskCard,
  CreateTaskModal,
  CreateProjectModal,
} from '../components/index.ts';
import {
  Plus,
  Folder,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  BarChart3,
  Calendar,
  Shield,
  Briefcase,
  Code2,
  ListTodo,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';
import type { Project, Task, TaskStatus, TaskPriority } from '../types/index.ts';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket, onlineCount, joinProject, leaveProject } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Active Project Selection from URL or local state
  const selectedProjectId = searchParams.get('projectId') || '';

  // 1. Fetch Projects accessible to the current user
  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const res = await projectsApi.getAll();
      if (res.data?.projects) {
        setProjects(res.data.projects);
      }
    } catch (err) {
      console.error('[Dashboard] Error loading projects:', err);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 2. Fetch Tasks based on active URL search params
  const fetchTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    try {
      const statusParam = (searchParams.get('status') as TaskStatus) || undefined;
      const priorityParam = (searchParams.get('priority') as TaskPriority) || undefined;
      const searchParam = searchParams.get('search') || undefined;
      const isOverdueParam = searchParams.get('isOverdue') === 'true';
      const dueParam = searchParams.get('due');

      let dueDateTo: string | undefined = undefined;
      let dueDateFrom: string | undefined = undefined;

      if (dueParam === 'TODAY') {
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        dueDateTo = endOfDay.toISOString();
      } else if (dueParam === 'THIS_WEEK') {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        dueDateTo = nextWeek.toISOString();
      }

      const res = await tasksApi.getAll({
        projectId: selectedProjectId || undefined,
        status: statusParam,
        priority: priorityParam,
        search: searchParam,
        isOverdue: isOverdueParam || undefined,
        dueDateFrom,
        dueDateTo,
        limit: 100,
      });

      if (res.data?.tasks) {
        let taskList = res.data.tasks;

        // Developer dashboard requirement: "sorted by priority then due date"
        if (user?.role === 'DEVELOPER') {
          const priorityWeight: Record<TaskPriority, number> = {
            CRITICAL: 4,
            HIGH: 3,
            MEDIUM: 2,
            LOW: 1,
          };
          taskList = [...taskList].sort((a, b) => {
            const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
            if (pDiff !== 0) return pDiff;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          });
        }

        setTasks(taskList);
      }
    } catch (err) {
      console.error('[Dashboard] Error loading tasks:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [selectedProjectId, searchParams, user?.role]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // 3. Subscribe to Real-Time Project Events via WebSocket
  useEffect(() => {
    if (selectedProjectId) {
      joinProject(selectedProjectId);
    }

    if (!socket) return;

    // When any user updates a task status, live sync without refreshing
    const handleTaskUpdated = () => {
      fetchTasks();
    };

    socket.on('task:updated', handleTaskUpdated);

    return () => {
      if (selectedProjectId) {
        leaveProject(selectedProjectId);
      }
      socket.off('task:updated', handleTaskUpdated);
    };
  }, [selectedProjectId, socket, joinProject, leaveProject, fetchTasks]);

  // Handle changing status from TaskCard
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await tasksApi.updateStatus(taskId, newStatus);
    } catch (err) {
      console.error('[Dashboard] Status update failed:', err);
      // Revert if failed
      fetchTasks();
    }
  };

  const handleSelectProject = (projectId: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (!projectId || projectId === 'ALL') {
      newParams.delete('projectId');
    } else {
      newParams.set('projectId', projectId);
    }
    setSearchParams(newParams);
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const now = Date.now();
    const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;

    const totalTasks = tasks.length;
    const todoTasks = tasks.filter((t) => t.status === 'TODO').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const inReviewTasks = tasks.filter((t) => t.status === 'IN_REVIEW').length;
    const doneTasks = tasks.filter((t) => t.status === 'DONE').length;

    const overdueTasks = tasks.filter(
      (t) =>
        t.status === 'OVERDUE' ||
        (t.status !== 'DONE' && new Date(t.dueDate).getTime() < now)
    ).length;

    const criticalTasks = tasks.filter((t) => t.priority === 'CRITICAL').length;
    const highTasks = tasks.filter((t) => t.priority === 'HIGH').length;

    const dueThisWeekTasks = tasks.filter((t) => {
      const dueTime = new Date(t.dueDate).getTime();
      return t.status !== 'DONE' && dueTime >= now && dueTime <= oneWeekFromNow;
    }).length;

    return {
      totalTasks,
      todoTasks,
      inProgressTasks,
      inReviewTasks,
      doneTasks,
      overdueTasks,
      criticalTasks,
      highTasks,
      dueThisWeekTasks,
    };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Top Navigation */}
      <Navbar
        onToggleActivity={() => setIsActivityOpen(!isActivityOpen)}
        isActivityOpen={isActivityOpen}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ========================================================= */}
        {/* 1. ROLE-SPECIFIC DASHBOARD HEADER & METRICS */}
        {/* ========================================================= */}

        {/* --- A. ADMIN DASHBOARD --- */}
        {user?.role === 'ADMIN' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-purple-100 text-purple-800">
                    <Shield className="w-5 h-5" />
                  </span>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Admin Executive Dashboard
                  </h1>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Global organization overview, cross-project workload, and live active users.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsCreateProjectOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4 text-slate-500" />
                  New Project
                </button>
                <button
                  onClick={() => setIsCreateTaskOpen(true)}
                  disabled={projects.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Task
                </button>
              </div>
            </div>

            {/* Admin Metrics Cards (Total projects, total tasks by status, overdue count, active online presence) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Projects */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total Projects
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{projects.length}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Active agency portfolios</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Folder className="w-5 h-5" />
                </div>
              </div>

              {/* Total Tasks & Status Breakdown */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Total Tasks
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">
                      {metrics.totalTasks}
                    </h3>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ListTodo className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] font-semibold">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {metrics.todoTasks} To Do
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                    {metrics.inProgressTasks} In Prog
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    {metrics.doneTasks} Done
                  </span>
                </div>
              </div>

              {/* Overdue Task Count */}
              <div
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.set('isOverdue', 'true');
                  setSearchParams(p);
                }}
                className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
                  metrics.overdueTasks > 0
                    ? 'bg-red-50/70 border-red-200 text-red-900'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wider">
                    Overdue Tasks
                  </p>
                  <h3 className="text-2xl font-bold text-red-700 mt-1">
                    {metrics.overdueTasks}
                  </h3>
                  <p className="text-[11px] text-red-500/80 mt-0.5">Click to filter overdue</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              {/* Live Presence Online Users */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Live Presence
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <h3 className="text-2xl font-bold text-slate-900">{onlineCount}</h3>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Active Now
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Real-time WebSocket count</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- B. PROJECT MANAGER DASHBOARD --- */}
        {user?.role === 'PROJECT_MANAGER' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-blue-100 text-blue-800">
                    <Briefcase className="w-5 h-5" />
                  </span>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Project Manager Portal
                  </h1>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Managing your owned client projects, team task priorities, and milestone deadlines.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsCreateProjectOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4 text-slate-500" />
                  New Project
                </button>
                <button
                  onClick={() => setIsCreateTaskOpen(true)}
                  disabled={projects.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Task
                </button>
              </div>
            </div>

            {/* PM Metrics Cards (Projects summary, tasks by priority, upcoming due dates this week) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    My Projects
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{projects.length}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Projects created by you</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Folder className="w-5 h-5" />
                </div>
              </div>

              {/* Tasks by Priority */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      High / Critical Priority
                    </p>
                    <h3 className="text-2xl font-bold text-orange-600 mt-1">
                      {metrics.criticalTasks + metrics.highTasks}
                    </h3>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] font-semibold">
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">
                    {metrics.criticalTasks} Critical
                  </span>
                  <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                    {metrics.highTasks} High
                  </span>
                </div>
              </div>

              {/* Upcoming Due Dates This Week */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Due This Week
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">
                    {metrics.dueThisWeekTasks}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Upcoming deadlines</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>

              {/* In Review Awaiting Sign-off */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    In Review
                  </p>
                  <h3 className="text-2xl font-bold text-purple-700 mt-1">
                    {metrics.inReviewTasks}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ready for review</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- C. DEVELOPER DASHBOARD --- */}
        {user?.role === 'DEVELOPER' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                    <Code2 className="w-5 h-5" />
                  </span>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Developer Workspace
                  </h1>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Your assigned tasks, sorted by priority (Critical → Low) then earliest due date.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchTasks}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sync Tasks
                </button>
              </div>
            </div>

            {/* Developer Metrics Cards (Assigned tasks, in progress, in review, overdue) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    My Assigned Tasks
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{tasks.length}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Total tasks on your plate</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ListTodo className="w-5 h-5" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    In Progress
                  </p>
                  <h3 className="text-2xl font-bold text-blue-600 mt-1">
                    {metrics.inProgressTasks}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Active development</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    In Review
                  </p>
                  <h3 className="text-2xl font-bold text-purple-600 mt-1">
                    {metrics.inReviewTasks}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Submitted for PM check</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div
                className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between ${
                  metrics.overdueTasks > 0
                    ? 'bg-red-50/70 border-red-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wider">
                    Overdue
                  </p>
                  <h3 className="text-2xl font-bold text-red-700 mt-1">
                    {metrics.overdueTasks}
                  </h3>
                  <p className="text-[11px] text-red-500/80 mt-0.5">Needs immediate attention</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. PROJECT TABS SELECTION */}
        {/* ========================================================= */}
        {projects.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
            <button
              onClick={() => handleSelectProject('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                !selectedProjectId
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Projects ({projects.length})
            </button>

            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  selectedProjectId === project.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{project.name}</span>
                {project.clientId && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      selectedProjectId === project.id
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {project.clientId}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. SHAREABLE URL TASK FILTERS */}
        {/* ========================================================= */}
        <TaskFilters />

        {/* ========================================================= */}
        {/* 4. TASK BOARD / LIST */}
        {/* ========================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Tasks ({tasks.length})
            </h3>
            {isLoadingTasks && (
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Updating board...
              </span>
            )}
          </div>

          {isLoadingTasks && tasks.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-slate-800">No tasks found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                No tasks match your current filter criteria, or none have been assigned yet.
              </p>
              {user?.role !== 'DEVELOPER' && (
                <button
                  onClick={() => setIsCreateTaskOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  Create First Task
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals & Live Drawers */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onTaskCreated={fetchTasks}
        projects={projects}
        defaultProjectId={selectedProjectId || undefined}
      />

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={fetchProjects}
      />

      <ActivityFeed
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        projectId={selectedProjectId || undefined}
      />
    </div>
  );
};

export default Dashboard;