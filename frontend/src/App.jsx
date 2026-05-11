import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { Navbar } from './components/Navbar';

function RoleRoute({ roles, children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} />;
  }

  return children;
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} /> : <AuthPage initialMode="login" />} />
        <Route path="/signup" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} /> : <AuthPage initialMode="signup" />} />
        <Route path="/forgot-password" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} /> : <AuthPage initialMode="forgot" />} />
        <Route path="/reset-password" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} /> : <ResetPasswordPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute roles={['admin']}>
                <AdminDashboardPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute roles={['member', 'admin']}>
                <DashboardPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <ProjectPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} /> : <Navigate to="/login" />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
