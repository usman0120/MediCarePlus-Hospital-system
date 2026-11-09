import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, userDetails, loading, authError, mfaVerified } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (authError) return <main className="p-6" role="alert">{authError}<button onClick={() => window.location.reload()} className="ml-3 underline">Retry</button></main>;

  if (!isAuthenticated || userDetails?.role === 'admin' && !mfaVerified) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userDetails?.role)) {
    return <Navigate to={`/${userDetails?.role || 'dashboard'}`} replace />;
  }

  return children;
};

export default ProtectedRoute;
