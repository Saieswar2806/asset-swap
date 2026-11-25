import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext.js";
import type { UserRole } from "../types.js";

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, isAuthenticated, loading, isAdmin, isBroker } = useUser();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Checking authorization...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
    if (isBroker) return <Navigate to="/broker/dashboard" replace />;
    return <Navigate to="/owner/dashboard" replace />;
  }

  return children ? <>{children}</> : null;
};
