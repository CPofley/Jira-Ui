import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, Navigate } from 'react-router-dom';

export default function LoginScreen() {
  const navigate = useNavigate();
  
  const token = localStorage.getItem('jira_token');
  // Check if token exists AND is not a corrupted text string
  const hasValidToken = token && token !== 'undefined' && token !== 'null';

  // 🔴 FIX 1: If they already have a token, bounce them to the Workspace hub
  if (hasValidToken) {
    return <Navigate to="/projects" replace />;
  }

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      const jwtToken = credentialResponse.credential;
      
      // 1. Save token so API calls work
      localStorage.setItem('jira_token', jwtToken);

      // 2. Sync with Spring Boot database
      const response = await fetch('http://localhost:8080/api/users/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const dbUser = await response.json();
        localStorage.setItem('jira_user', JSON.stringify(dbUser));
        
        // 🔴 FIX 2: Navigate securely to the workspace hub after successful login
        navigate('/projects', { replace: true });
      } else {
        console.error("Backend sync failed");
        localStorage.removeItem('jira_token'); // Clear token if DB sync fails
        alert("Authentication failed during backend database sync.");
      }
    } catch (error) {
      console.error("Network error during login sequence", error);
      localStorage.removeItem('jira_token');
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50 font-sans">
      <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-lg border border-slate-200 text-center flex flex-col items-center">
        
        <div className="bg-blue-600 text-white p-2 rounded font-bold text-xl mb-6 w-12 h-12 flex items-center justify-center">
          Jira
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome Back</h2>
        <p className="text-slate-500 text-sm mb-8">Sign in to access your custom workspace</p>
        
        <div className="w-full flex justify-center">
          <GoogleLogin
            onSuccess={handleLoginSuccess}
            onError={() => {
              console.error('Google Login Failed');
              alert("Login failed. Please try again.");
            }}
            useOneTap 
          />
        </div>
      </div>
    </div>
  );
}