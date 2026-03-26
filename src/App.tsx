/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
import CourseDetail from './CourseDetail';
import AdminDashboard from './Admin.tsx';
import AdminLogin from './AdminLogin.tsx';
import About from './About.tsx';

// Protected Route Component
const ProtectedRoute = ({ children, loginElement }: { children: React.ReactNode, loginElement?: React.ReactNode }) => {
  const [loading, setLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    const checkAuth = () => {
      const session = sessionStorage.getItem('admin_session');
      if (session === 'true') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();
    window.addEventListener('admin-login', checkAuth);
    window.addEventListener('admin-logout', checkAuth);
    return () => {
      window.removeEventListener('admin-login', checkAuth);
      window.removeEventListener('admin-logout', checkAuth);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return loginElement ? <>{loginElement}</> : <Navigate to="/admin" />;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/course/:id" element={<CourseDetail />} />
        <Route path="/about" element={<About />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute loginElement={<AdminLogin />}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
          />
      </Routes>
    </Router>
  );
}
