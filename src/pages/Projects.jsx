import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { X, Plus, FolderKanban } from 'lucide-react';

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Permanently lock page into dark mode on mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  }, []);

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
    return <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-400 text-xs">Loading workspaces...</div>;
  }

  return (
    <div className="min-h-screen w-screen bg-slate-900 p-8 font-sans text-slate-100">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FolderKanban className="text-blue-400" size={24} />
            <span>Your Workspaces</span>
          </h1>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus size={16} />
            <span>Create Project</span>
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-200 mb-2">No projects yet</h2>
            <p className="text-slate-400 text-xs mb-6">Create your first project workspace to start organizing tasks.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map(project => (
              <div 
                key={project.id || project.projectId} 
                onClick={() => navigate(`/dashboard/${project.id || project.projectId}`)}
                className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:shadow-md hover:border-blue-500 transition-all cursor-pointer group"
              >
                <h3 className="font-bold text-slate-100 text-lg mb-1 group-hover:text-blue-400 transition-colors">{project.projectName}</h3>
                <p className="text-slate-400 text-xs truncate">{project.projectDescription}</p>
              </div>
            ))}
          </div>
        )}

        {/* CREATE MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 w-full max-w-md p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center pb-3 border-b border-slate-700 mb-4">
                <h2 className="text-base font-semibold text-slate-100">Create New Project</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreateProject}>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Project Name</label>
                  <input 
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Backend Engine"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none text-slate-100 placeholder-slate-600"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Description</label>
                  <textarea 
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="What is this project about?"
                    rows="3"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none text-slate-100 placeholder-slate-600 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-700">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-700 rounded font-medium cursor-pointer transition-colors">Cancel</button>
                  <button type="submit" disabled={isCreating} className="px-3.5 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:bg-blue-800 disabled:text-slate-400 cursor-pointer shadow-sm">
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