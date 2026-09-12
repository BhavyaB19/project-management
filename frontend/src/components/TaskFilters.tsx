import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, X, Calendar, AlertCircle } from 'lucide-react';
import type { TaskStatus, TaskPriority } from '../types/index.ts';

export const TaskFilters: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract current filter values from URL search params
  const currentStatus = searchParams.get('status') || '';
  const currentPriority = searchParams.get('priority') || '';
  const currentSearch = searchParams.get('search') || '';
  const isOverdueFilter = searchParams.get('isOverdue') === 'true';
  const dueFilter = searchParams.get('due') || '';

  const updateParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (!value || value === 'ALL') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    // Always reset page to 1 when changing filters
    newParams.delete('page');
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    const newParams = new URLSearchParams();
    // Preserve active project if present
    const project = searchParams.get('projectId');
    if (project) {
      newParams.set('projectId', project);
    }
    setSearchParams(newParams);
  };

  const hasActiveFilters =
    Boolean(currentStatus) ||
    Boolean(currentPriority) ||
    Boolean(currentSearch) ||
    isOverdueFilter ||
    Boolean(dueFilter);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks by title or #number..."
            value={currentSearch}
            onChange={(e) => updateParam('search', e.target.value.trim() ? e.target.value : null)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
          {currentSearch && (
            <button
              onClick={() => updateParam('search', null)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={currentStatus || 'ALL'}
              onChange={(e) => updateParam('status', e.target.value)}
              aria-label="Filter by Status"
              className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors appearance-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={currentPriority || 'ALL'}
              onChange={(e) => updateParam('priority', e.target.value)}
              aria-label="Filter by Priority"
              className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors appearance-none cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Due Date Filter */}
          <div className="relative">
            <select
              value={dueFilter || (isOverdueFilter ? 'OVERDUE' : 'ALL')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'OVERDUE') {
                  updateParam('isOverdue', 'true');
                  updateParam('due', null);
                } else {
                  updateParam('isOverdue', null);
                  updateParam('due', val);
                }
              }}
              aria-label="Filter by Due Date"
              className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors appearance-none cursor-pointer"
            >
              <option value="ALL">Any Due Date</option>
              <option value="OVERDUE">🚨 Overdue Only</option>
              <option value="TODAY">Due Today</option>
              <option value="THIS_WEEK">Due This Week</option>
            </select>
            <Calendar className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
