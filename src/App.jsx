import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

import Projects from './pages/Projects';
import JiraDashboard from './pages/Dashboard';
import TaskDetailsPage from './pages/TaskDetails';
import LoginScreen from './pages/Login'; 

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('jira_token');
  const hasValidToken = token && token !== 'undefined' && token !== 'null';
  
  if (!hasValidToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const GOOGLE_CLIENT_ID = "573914069268-oedbe0oo2ncfe7nrrr94qevn6r9500jh.apps.googleusercontent.com";

  // Permanently lock the root document into dark mode on mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen w-full bg-slate-900 text-slate-100 transition-colors duration-200">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/login" element={<LoginScreen />} />
            
            <Route 
              path="/projects" 
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/dashboard/:projectId" 
              element={
                <ProtectedRoute>
                  <JiraDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/tasks/details" 
              element={
                <ProtectedRoute>
                  <TaskDetailsPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;