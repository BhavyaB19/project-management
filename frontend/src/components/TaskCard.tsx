import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { formatDate } from '../utils/date.ts';
import {
  Calendar,
  AlertTriangle
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '../types/index.ts';

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange }) => {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // Check role-based permission to update task status
  // Developers: only if assigned to them
  // PM & Admin: full status update rights on project tasks
  const canUpdateStatus =
    user?.role === 'ADMIN' ||
    user?.role === 'PROJECT_MANAGER' ||
    (user?.role === 'DEVELOPER' && task.assigneeId === user.id);

  const isOverdue =
    task.status === 'OVERDUE' ||
    (task.status !== 'DONE' && new Date(task.dueDate).getTime() < Date.now());

  const handleStatusSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as TaskStatus;
    if (nextStatus === task.status) return;

    setIsUpdating(true);
    try {
      await onStatusChange(task.id, nextStatus);
    } catch (err) {
      console.error('Failed to update task status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
            Critical
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
            High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'TODO':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_REVIEW':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DONE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'OVERDUE':
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div
      className={`p-4 bg-white rounded-xl border transition-all hover:shadow-md flex flex-col justify-between gap-3 ${
        isOverdue ? 'border-red-300 ring-1 ring-red-200/50' : 'border-slate-200'
      }`}
    >
      {/* Top Meta Bar */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              #{task.taskNumber}
            </span>
            {getPriorityBadge(task.priority)}
          </div>

          {/* Overdue Warning Flag */}
          {isOverdue && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
              <AlertTriangle className="w-3 h-3" />
              Overdue
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h4 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Footer Info & Status Dropdown */}
      <div className="pt-3 border-t border-slate-100 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          {/* Assignee */}
          <div className="flex items-center gap-1.5 truncate max-w-[150px]">
            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-700">
              {task.assignee?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="truncate">{task.assignee?.name || 'Unassigned'}</span>
          </div>

          {/* Due Date */}
          <div
            className={`flex items-center gap-1 font-medium text-[11px] ${
              isOverdue ? 'text-red-600' : 'text-slate-500'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
        </div>

        {/* Status Control */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-400">Status</span>
          {canUpdateStatus ? (
            <select
              value={task.status}
              disabled={isUpdating}
              onChange={handleStatusSelect}
              aria-label={`Update status for task #${task.taskNumber}`}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-colors ${getStatusBadge(
                task.status
              )}`}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
              {task.status === 'OVERDUE' && <option value="OVERDUE">Overdue</option>}
            </select>
          ) : (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${getStatusBadge(
                task.status
              )}`}
            >
              {task.status.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
