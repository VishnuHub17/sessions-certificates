// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import SessionsPage from './pages/SessionsPage.jsx';
import SessionDetailPage from './pages/SessionDetailPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute>
              <SessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/:sessionId"
          element={
            <ProtectedRoute>
              <SessionDetailPage />
            </ProtectedRoute>
          }
        />
        {/* Redirect unknown routes */}
        <Route
          path="*"
          element={<RedirectHandler />}
        />
      </Routes>
    </Router>
  );
};

// Helper component to redirect based on auth state
import { useAuth } from './context/AuthContext.jsx';
const RedirectHandler = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null; // could show a spinner
  return <Navigate to={isAuthenticated ? '/sessions' : '/login'} replace />;
};

export default App;
