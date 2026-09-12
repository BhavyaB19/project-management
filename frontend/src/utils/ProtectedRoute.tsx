import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { getStoredToken } from '../lib/api.ts';

const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  const hasToken = Boolean(getStoredToken());

  // While checking /api/auth/me on initial page load
  if (isLoading && hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // If no token in storage or context, redirect to login
  if (!hasToken && !user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
