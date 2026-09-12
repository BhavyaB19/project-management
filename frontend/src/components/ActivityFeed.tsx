import React, { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext.tsx';
import { activityApi } from '../lib/api.ts';
import { formatRelativeTime } from '../utils/date.ts';
import {
  Activity,
  X,
  RefreshCw,
  Clock,
  ArrowRight,
  PlusCircle,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import type { ActivityLog } from '../types/index.ts';

interface ActivityFeedProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ isOpen, onClose, projectId }) => {
  const { liveActivities } = useSocket();
  const [dbActivities, setDbActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Requirement: Fetch last 20 activity events from PostgreSQL on mount / offline catchup
  const fetchMissedActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await activityApi.getRecent({
        limit: 20,
        projectId: projectId || undefined,
      });
      if (response.data?.activities) {
        setDbActivities(response.data.activities);
      }
    } catch (err: any) {
      setError('Failed to fetch recent activities');
      console.error('[ActivityFeed] Error fetching activities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMissedActivities();
  }, [fetchMissedActivities]);

  // Combine database events with real-time incoming socket events without duplicates
  const allActivities = React.useMemo(() => {
    const combined = [...liveActivities, ...dbActivities];
    const seen = new Set<string>();
    return combined.filter((item) => {
      const key = item.id || `${item.taskId}-${item.createdAt}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [liveActivities, dbActivities]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'STATUS_CHANGE':
        return <ArrowRight className="w-3.5 h-3.5 text-blue-500" />;
      case 'CREATED':
        return <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case 'ASSIGNED':
        return <UserCheck className="w-3.5 h-3.5 text-purple-500" />;
      case 'OVERDUE':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white border-l border-slate-200 shadow-xl flex flex-col animate-in slide-in-from-right duration-200"
      aria-label="Live Activity Feed"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-700">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Live Activity Feed</h3>
            <p className="text-[11px] text-slate-500">Real-time team updates & history</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchMissedActivities}
            disabled={isLoading}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            title="Close feed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && allActivities.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading activity stream...</div>
        ) : error && allActivities.length === 0 ? (
          <div className="py-12 text-center text-red-500 text-sm">{error}</div>
        ) : allActivities.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No activities recorded yet.
          </div>
        ) : (
          allActivities.map((item) => (
            <div
              key={item.id || `${item.taskId}-${item.createdAt}`}
              className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 p-1 rounded bg-white shadow-xs border border-slate-100 shrink-0">
                  {getActionIcon(item.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {item.formattedMessage}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{formatRelativeTime(item.createdAt)}</span>
                    {item.projectName && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[120px] font-mono text-slate-500">
                          {item.projectName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
        Connected to WebSocket • Auto-syncing
      </div>
    </aside>
  );
};
