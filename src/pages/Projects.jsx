import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const getAuthHeaders = () => {
    return {
      'Authorization': `Bearer ${localStorage.getItem('jira_token')}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch the user's projects when the page loads
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/my-projects`, {
        headers: getAuthHeaders()
      });

      // Catch expired tokens from the backend
      if (response.status === 401 || response.status === 403) {
        console.warn("Token expired. Redirecting to login...");
        localStorage.removeItem('jira_token'); // Destroy the dead token
        navigate('/login'); // Kick them out!
        return; 
      }

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    setIsCreating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
            projectName: newProjectName,
            projectDescription: newProjectDesc || "No description provided"
        })
      });
      
      if (response.ok) {
        const createdProject = await response.json();
        setShowCreateModal(false);
        // Instantly route them into their brand new workspace!
        navigate(`/dashboard/${createdProject.id || createdProject.projectId}`);
      }
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading workspaces...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Your Workspaces</h1>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
          >
            + Create Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-2">No projects yet</h2>
            <p className="text-slate-500 mb-6">Create your first project workspace to start organizing tasks.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map(project => (
              <div 
                key={project.id || project.projectId} 
                onClick={() => navigate(`/dashboard/${project.id || project.projectId}`)}
                className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
              >
                <h3 className="font-bold text-slate-900 text-lg mb-1">{project.projectName}</h3>
                <p className="text-slate-500 text-sm truncate">{project.projectDescription}</p>
              </div>
            ))}
          </div>
        )}

        {/* CREATE MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Create New Project</h2>
              <form onSubmit={handleCreateProject}>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Project Name</label>
                  <input 
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Backend Engine"
                    className="w-full border border-slate-300 rounded p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                  <textarea 
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="What is this project about?"
                    className="w-full border border-slate-300 rounded p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium">Cancel</button>
                  <button type="submit" disabled={isCreating} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:bg-blue-400">
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}