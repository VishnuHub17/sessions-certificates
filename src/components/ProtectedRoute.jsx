// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null; // could render a spinner
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
