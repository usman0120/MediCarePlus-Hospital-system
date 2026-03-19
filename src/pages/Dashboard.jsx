import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

const Dashboard = () => {
  const { userDetails } = useAuth();

  // Redirect to role-specific dashboard
  if (userDetails) {
    return <Navigate to={`/${userDetails.role}`} replace />;
  }

  return null;
};

export default Dashboard;