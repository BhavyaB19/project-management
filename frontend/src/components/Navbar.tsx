import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../context/SocketContext.tsx';
import {
  Bell,
  Activity,
  LogOut,
  Users,
  Shield,
  Briefcase,
  Code2,
  CheckCircle2,
} from 'lucide-react';
import type { Role } from '../types/index.ts';

interface NavbarProps {
  onToggleActivity: () => void;
  isActivityOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleActivity, isActivityOpen }) => {
  const { user, logout } = useAuth();
  const { onlineCount, isConnected, liveActivities } = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; message: string; time: string; read: boolean }>
  >([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Automatically generate in-app notifications from real-time events relevant to current user
  useEffect(() => {
    if (liveActivities.length === 0 || !user) return;

    const latest = liveActivities[0];
    if (!latest) return;

    let notificationItem: { id: string; title: string; message: string; time: string; read: boolean } | null = null;

    // 1. When a task is assigned to developer -> Dev receives in-app notification
    if (latest.action === 'ASSIGNED' && user.role === 'DEVELOPER') {
      notificationItem = {
        id: latest.id || String(Date.now()),
        title: 'New Task Assignment',
        message: latest.formattedMessage,
        time: 'Just now',
        read: false,
      };
    }
    // 2. When a task owned by PM is moved to IN_REVIEW -> PM receives notification
    else if (
      latest.action === 'STATUS_CHANGE' &&
      latest.details?.to === 'IN_REVIEW' &&
      user.role === 'PROJECT_MANAGER'
    ) {
      notificationItem = {
        id: latest.id || String(Date.now()),
        title: 'Task Ready For Review',
        message: latest.formattedMessage,
        time: 'Just now',
        read: false,
      };
    }

    if (notificationItem) {
      setNotifications((prev) => [notificationItem!, ...prev.slice(0, 19)]);
    }
  }, [liveActivities, user]);

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? ({ ...n, read: true }) : n)));
  };

  const getRoleBadge = (role?: Role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-3 h-3" />
            Admin
          </span>
        );
      case 'PROJECT_MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Briefcase className="w-3 h-3" />
            Project Manager
          </span>
        );
      case 'DEVELOPER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Code2 className="w-3 h-3" />
            Developer
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">Velozity</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  Dashboard
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Client Project & Task Management</p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Live Presence Count (Crucial for Admin Dashboard) */}
            {user?.role === 'ADMIN' && (
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                title="Active users online now via WebSocket"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  <strong className="font-semibold">{onlineCount}</strong> online
                </span>
              </div>
            )}

            {/* WebSocket status pill for other roles */}
            {user?.role !== 'ADMIN' && (
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  isConnected
                    ? 'bg-slate-50 text-slate-600 border border-slate-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
                title={isConnected ? 'Real-time sync active' : 'Connecting to real-time server...'}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <span className="hidden md:inline">{isConnected ? 'Live' : 'Connecting'}</span>
              </div>
            )}

            {/* Activity Feed Toggle */}
            <button
              onClick={onToggleActivity}
              className={`p-2 rounded-lg border transition-colors relative ${
                isActivityOpen
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              title="Toggle Live Activity Feed"
            >
              <Activity className="w-4 h-4" />
              {liveActivities.length > 0 && !isActivityOpen && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
              )}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-slate-700" />
                      <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center px-4">
                        <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No new notifications</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Task assignments and review alerts will appear here
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                            !n.read ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {!n.read && (
                                <span className="h-2 w-2 rounded-full bg-indigo-600 inline-block" />
                              )}
                              <h4 className="text-xs font-semibold text-slate-900">{n.title}</h4>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-slate-400">{n.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            {/* Current User & Role */}
            <div className="flex items-center gap-2.5">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-900 leading-none">
                  {user?.name || user?.email.split('@')[0]}
                </span>
                <div className="mt-1">{getRoleBadge(user?.role)}</div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
