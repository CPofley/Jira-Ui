import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

import Projects from './pages/Projects'; // 🔴 NEW: Import your Projects page
import JiraDashboard from './pages/Dashboard';
import TaskDetailsPage from './pages/TaskDetails';
import LoginScreen from './pages/Login'; 

// --- BULLETPROOF PROTECTED ROUTE WRAPPER ---
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('jira_token');
  
  // Strictly ensure the token is valid, not just a string that says "null"
  const hasValidToken = token && token !== 'undefined' && token !== 'null';
  
  if (!hasValidToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const GOOGLE_CLIENT_ID = "573914069268-oedbe0oo2ncfe7nrrr94qevn6r9500jh.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          {/* 🔴 UPDATED: Base URL now redirects to the workspace selector */}
          <Route path="/" element={<Navigate to="/projects" replace />} />
          
          {/* Public Login Route */}
          <Route path="/login" element={<LoginScreen />} />
          
          {/* 🔴 NEW: Protected Projects Route */}
          <Route 
            path="/projects" 
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            } 
          />
          
          {/* 🔴 UPDATED: Dashboard now expects a dynamic :projectId in the URL */}
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
    </GoogleOAuthProvider>
  );
}

export default App;