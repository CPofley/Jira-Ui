import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown'; 
import SimpleMDE from 'react-simplemde-editor'; 
import 'easymde/dist/easymde.min.css';      
import remarkBreaks from 'remark-breaks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';  

import { 
  ChevronRight, 
  ArrowLeft, 
  Check, 
  X, 
  Trash2, 
  Bug,          
  Bookmark,     
  CheckSquare,  
  MessageSquare, 
  Zap,
  AlertTriangle 
} from 'lucide-react'; 

const STATUS_STYLES = {
  TO_DO: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  DONE: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  DEFAULT: 'bg-slate-50 text-slate-600 border-slate-200'
};

const PRIORITY_STYLES = {
  LOW: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold hover:bg-blue-100',
  MEDIUM: 'bg-slate-100 text-slate-700 border-slate-300 font-semibold hover:bg-slate-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200 font-bold hover:bg-orange-100',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200 font-extrabold animate-pulse hover:bg-red-100',
  DEFAULT: 'bg-slate-50 text-slate-600 border-slate-200'
};

const TYPE_STYLES = {
  STORY: 'bg-green-600 text-white border-transparent',
  BUG: 'bg-red-600 text-white border-transparent',
  TASK: 'bg-blue-500 text-white border-transparent',
  EPIC: 'bg-purple-600 text-white border-transparent',
  DEFAULT: 'bg-slate-500 text-white border-transparent'
};

const COMPACT_TYPE_STYLES = {
  STORY: 'bg-green-50 text-green-700 border-green-200',
  BUG: 'bg-red-50 text-red-700 border-red-200',
  TASK: 'bg-blue-50 text-blue-700 border-blue-200',
  EPIC: 'bg-purple-50 text-purple-700 border-purple-200',
  DEFAULT: 'bg-slate-50 text-slate-700 border-slate-200'
};

const TYPE_ICONS = {
  STORY: <Bookmark size={12} className="fill-current text-white mr-1.5" />,
  BUG: <Bug size={12} className="text-white mr-1.5" />,
  TASK: <CheckSquare size={12} className="text-white mr-1.5" />,
  EPIC: <Zap size={12} className="fill-current text-white mr-1.5" />,
  DEFAULT: <CheckSquare size={12} className="text-white mr-1.5" />
};

export default function TaskDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const taskId = params.get('taskId');

  const titleRef = useRef(null); 
  const userDropdownRef = useRef(null); // Ref for outside clicks tracking

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState(null);
  const [editingValues, setEditingValues] = useState({});
  
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [updatingComment, setUpdatingComment] = useState(false);

  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkingTaskId, setLinkingTaskId] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('error');
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 🟢 State to control profile details display menu trigger block
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [metadata, setMetadata] = useState({
    statuses: ['TO_DO', 'IN_PROGRESS', 'DONE'],
    priorities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    taskTypes: ['STORY', 'BUG', 'TASK', 'EPIC']
  });

  const mdeOptions = useMemo(() => {
    return {
      autofocus: false,
      spellChecker: false,
      placeholder: "Write your text here...",
      minHeight: "80px",
      status: false, 
      toolbar: [
        "bold", "italic", "heading", "|", 
        "quote", "unordered-list", "ordered-list", "|", 
        "code", "clean-block", "|", 
        "preview"
      ],
    };
  }, []);

  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      if (children == null) return null;
      
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      
      if (!codeString.trim()) return null;

      if (inline) {
        return (
          <code className="bg-slate-200 text-slate-800 font-mono text-[11px] px-1.5 py-0.5 rounded mx-0.5 break-words" {...props}>
            {children}
          </code>
        );
      }

      return (
        <SyntaxHighlighter
            style={vscDarkPlus}
            language={match ? match[1] : "json"} 
            PreTag="div"
            className="rounded-md text-[11px] my-3 shadow-sm border border-slate-700 max-w-full"
            wrapLongLines={true} 
            wrapLines={true}
            codeTagProps={{ style: { wordBreak: 'break-word', whiteSpace: 'pre-wrap' } }}
            {...props}
          >
            {codeString}
        </SyntaxHighlighter>
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jira_token');
    localStorage.removeItem('jira_user');
    localStorage.removeItem('jira_user_avatar');
    navigate('/login', { replace: true });
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('jira_token');
    if (!token) {
      handleLogout();
      return {}; 
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const autoResizeTitle = () => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (!taskId) return;

    const fetchTaskPromise = fetch(`http://localhost:8080/api/tasks/get/created-task?taskId=${taskId}`, {
      headers: getAuthHeaders()
    }).then((res) => {
      if (res.status === 401) { handleLogout(); throw new Error("Unauthorized"); }
      if (!res.ok) throw new Error("Task not found");
      return res.json();
    }).then((data) => data.tasks || data);

    const fetchMetadataPromise = fetch(`http://localhost:8080/api/tasks/config`, {
      headers: getAuthHeaders()
    }).then((res) => res.ok ? res.json() : null).catch(() => null);

    const fetchCommentsPromise = fetch(`http://localhost:8080/api/comments/task/${taskId}`, {
      headers: getAuthHeaders()
    }).then((res) => res.ok ? res.json() : []).catch(() => []);

    Promise.all([fetchTaskPromise, fetchMetadataPromise, fetchCommentsPromise])
      .then(([taskData, metaData, commentData]) => {
        setTask(taskData);
        setEditingValues(taskData); 
        if (metaData) setMetadata(metaData);
        setComments(commentData || []);
        setLoading(false);
        setTimeout(() => {
          autoResizeTitle();
        }, 50);
      })
      .catch((err) => {
        console.error("Error loading details page data:", err);
        setLoading(false);
      });
  }, [taskId]);

  // Close dropdown menu automatically if user clicks elsewhere outside components bounds
  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (fieldName, value) => {
    setEditingValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const commitFieldUpdate = async (fieldName) => {
    const newValue = editingValues[fieldName];
    setSavingField(fieldName);

    try {
      const response = await fetch(`http://localhost:8080/api/tasks/update/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ [fieldName]: newValue })
      });

      if (response.status === 401) {
        handleLogout();
        return false;
      }

      if (response.ok) {
        const updatedTask = await response.json();
        setTask(updatedTask);
        setEditingValues(updatedTask);
        setTimeout(() => {
          if (fieldName === 'title') autoResizeTitle();
        }, 50);
        showToast("Changes saved successfully!", "success");
        return true; 
      } else {
        showToast("Changes couldn't save to the database server.", "error");
        return false;
      }
    } catch (error) {
      console.error(`Error saving ${fieldName}:`, error);
      showToast("Network exception error saving field changes.", "error");
      return false;
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveDescription = async () => {
    const success = await commitFieldUpdate('description');
    if (success) {
      setIsEditingDescription(false);
    }
  };

  const cancelFieldUpdate = (fieldName) => {
    setEditingValues(prev => ({ ...prev, [fieldName]: task[fieldName] }));
    setTimeout(() => {
      if (fieldName === 'title') autoResizeTitle();
    }, 50);
  };
  
  const executeDeleteTask = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`http://localhost:8080/api/tasks/delete/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        showToast("Task deleted successfully!", "success");
        setShowDeleteModal(false);
        const targetProjectId = task?.projectId || task?.project?.id || 1;
        setTimeout(() => {
          window.location.href = `/dashboard/${targetProjectId}`;
        }, 800);
      } else {
        showToast("Failed to delete the task resource from backend.", "error");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      showToast("Failed to complete task delete execution.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLinkTaskSubmit = async (e) => {
    e.preventDefault();
    if (!linkingTaskId || isLinking) return;

    setIsLinking(true);
    try {
      const response = await fetch('http://localhost:8080/api/tasks/link-tasks', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentTaskId: parseInt(taskId),
          taskToLinkId: parseInt(linkingTaskId)
        })
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      const data = await response.text();

      if (response.ok) {
        showToast("Issues linked successfully!", "success");
        setLinkingTaskId('');
        setLinkSearchQuery('');
        setTimeout(() => window.location.reload(), 1200); 
      } else {
        showToast(`Linking Failed: ${data || "Invalid hierarchy pairing rules applied"}`, "error");
      }
    } catch (error) {
      console.error("Error executing linking pipeline:", error);
      showToast("Network error exception caught during task link submission.", "error");
    } finally {
      setIsLinking(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || savingComment) return;

    setSavingComment(true);

    const payload = {
      taskId: parseInt(taskId),          
      comment: newComment.trim(),        
      author: task.createdBy && task.createdBy.trim() !== "" ? task.createdBy : "User"
    };

    try {
      const response = await fetch('http://localhost:8080/api/comments/save', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        const savedCommentDto = await response.json();
        setComments(prev => [savedCommentDto, ...prev]);
        setNewComment('');
        showToast("Comment added successfully!", "success");
      } else {
        showToast("Server rejected comment submission validation parameters.", "error");
      }
    } catch (error) {
      console.error("Error saving comment:", error);
      showToast("Network exception failed to append new comment.", "error");
    } finally {
      setSavingComment(false);
    }
  };

  const startEditingComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.comment);
  };

  const handleUpdateComment = async (commentId) => {
    if (!editingCommentText.trim() || updatingComment) return;

    setUpdatingComment(true);
    try {
      const response = await fetch(`http://localhost:8080/api/comments/update`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          commentId: commentId, 
          comment: editingCommentText.trim() 
        })
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        const updatedCommentDto = await response.json();
        setComments(prev => prev.map(c => c.id === commentId ? updatedCommentDto : c));
        setEditingCommentId(null);
        setEditingCommentText('');
        showToast("Comment updated successfully!", "success");
      } else {
        showToast("Failed to update comment changes on server.", "error");
      }
    } catch (error) {
      console.error("Error updating comment:", error);
      showToast("Failed to modify target comment metadata string.", "error");
    } finally {
      setUpdatingComment(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    showToast("Comment discarded locally.", "success");
  };

  // SHARED USER METADATA PARSING ENGINE
  const storedUserRaw = localStorage.getItem('jira_user');
  const parsedUserData = useMemo(() => {
    if (!storedUserRaw) return null;
    try {
      if (storedUserRaw.trim().startsWith('{')) return JSON.parse(storedUserRaw);
    } catch (e) { console.error(e); }
    return null;
  }, [storedUserRaw]);

  const displayUserName = useMemo(() => {
    if (parsedUserData) return parsedUserData.username || parsedUserData.name || parsedUserData.email?.split('@')[0] || 'User';
    return storedUserRaw || 'User';
  }, [parsedUserData, storedUserRaw]);

  const avatarUrl = useMemo(() => {
    let rawUrl = localStorage.getItem('jira_user_avatar');
    if ((!rawUrl || rawUrl === 'null' || rawUrl === 'undefined') && parsedUserData) {
      rawUrl = parsedUserData.pictureUrl || parsedUserData.picture;
    }
    if (!rawUrl) return null;
    if (rawUrl.startsWith('"') && rawUrl.endsWith('"')) {
      try { return JSON.parse(rawUrl); } catch (e) { return rawUrl.replace(/^"|"$/g, ''); }
    }
    return rawUrl;
  }, [parsedUserData]);

  if (loading) return <div className="p-8 text-slate-500 text-left">Loading task context...</div>;
  if (!task) return <div className="p-8 text-red-500 text-left">Task details unavailable.</div>;

  const currentTaskType = (task.taskType || 'TASK').toUpperCase();

  return (
    <div className="min-h-screen w-screen bg-white font-sans text-sm text-slate-800 text-left mb-12 relative">
      
      {/* Interactive Breadcrumb Bar with Right-Aligned Avatar Layout Header */}
      <div className="px-8 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs flex-wrap">
          <button onClick={() => navigate('/projects')} className="hover:text-blue-600 hover:underline transition-colors cursor-pointer">
            Projects
          </button>
          
          <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
          
          <button onClick={() => navigate(-1)} className="hover:text-blue-600 hover:underline transition-colors cursor-pointer">
            Core Engine
          </button>
          
          {task.parentTask && (
            <>
              <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
              <button 
                onClick={() => navigate(`/tasks/details?taskId=${task.parentTask.id}`)} 
                className="font-mono font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1.5"
                title={task.parentTask.title}
              >
                <span>TASK-{task.parentTask.id}</span>
                <span className={`px-1 rounded text-[8px] font-bold uppercase border scale-90 ${COMPACT_TYPE_STYLES[task.parentTask.taskType?.toUpperCase()] || COMPACT_TYPE_STYLES.DEFAULT}`}>
                  {task.parentTask.taskType?.toLowerCase()}
                </span>
              </button>
            </>
          )}

          <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">TASK-{taskId}</span>
          
          <span className={`ml-2 px-2 py-0.5 text-[10px] rounded border font-bold uppercase tracking-wider flex items-center ${TYPE_STYLES[currentTaskType] || TYPE_STYLES.DEFAULT}`}>
            {TYPE_ICONS[currentTaskType] || TYPE_ICONS.DEFAULT}
            {task.taskType || 'TASK'}
          </span>
        </div>

        {/* 🟢 FIXED: Interactive Profile Avatar Header with Hover-Zoom and Clickable Detail Card */}
        <div className="flex items-center gap-2.5 border-l border-slate-200 pl-4 h-7 relative" ref={userDropdownRef}>
          <span className="font-semibold text-slate-700 text-xs truncate max-w-[120px] capitalize">
            {displayUserName}
          </span>
          
          <button 
            type="button"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="relative h-7 w-7 flex-shrink-0 focus:outline-none group/avatar cursor-pointer"
          >
            {avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined' && avatarUrl.trim() !== '' ? (
              <img 
                src={avatarUrl} 
                alt="User Avatar" 
                className="h-full w-full rounded-full object-cover border border-slate-200 shadow-xs transition-all duration-200 ease-in-out group-hover/avatar:scale-130 group-hover/avatar:shadow-md z-10 relative"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUserName)}&background=2563eb&color=fff`;
                }}
              />
            ) : (
              <div className="h-full w-full rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shadow-inner uppercase transition-all duration-200 ease-in-out group-hover/avatar:scale-130 group-hover/avatar:shadow-md z-10 relative">
                {displayUserName && displayUserName.trim() !== '' ? displayUserName.trim().charAt(0) : 'U'}
              </div>
            )}
            <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-1 ring-white z-20 transition-all group-hover/avatar:translate-x-0.5 group-hover/avatar:translate-y-0.5" />
          </button>

          {/* 🔘 SLIDE-DOWN ACTIVE USER DETAILS PROFILE CARD */}
          {showUserDropdown && (
            <div className="absolute right-0 top-9 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-14 w-14 rounded-full overflow-hidden border border-slate-200 shadow-xs bg-slate-50">
                  {avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined' && avatarUrl.trim() !== '' ? (
                    <img src={avatarUrl} alt={displayUserName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-full w-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center uppercase">
                      {displayUserName.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className="space-y-0.5 w-full">
                  <h4 className="text-sm font-bold text-slate-800 capitalize truncate">
                    {displayUserName}
                  </h4>
                  <p className="text-[11px] font-medium text-slate-500 truncate">
                    {parsedUserData?.email || 'No email attached'}
                  </p>
                </div>

                <div className="w-full border-t border-slate-100 pt-2.5 mt-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold border border-green-200 uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Authorized Session
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex max-w-7xl mx-auto px-8 py-6 gap-8">
        <div className="flex-1 min-w-0 space-y-6">
          
          {/* Summary Title Block */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Summary / Title</label>
            <div className="flex items-start gap-2">
              <textarea
                ref={titleRef}
                rows="1"
                value={editingValues.title || ''}
                onInput={autoResizeTitle}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="text-2xl font-semibold text-slate-900 leading-tight w-full border border-transparent hover:border-slate-200 focus:border-blue-500 rounded px-2 py-1 outline-none transition-all bg-transparent focus:bg-white resize-none overflow-hidden h-auto"
              />
              {editingValues.title !== task.title && (
                <div className="flex gap-1 pt-1">
                  <button onClick={() => commitFieldUpdate('title')} className="p-1 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"><Check size={16} /></button>
                  <button onClick={() => {
                    cancelFieldUpdate('title');
                    setTimeout(autoResizeTitle, 50);
                  }} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 cursor-pointer"><X size={16} /></button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-slate-900 font-semibold mb-2">Description</h3>
            {isEditingDescription ? (
              <div className="flex flex-col gap-2 comment-editor-wrapper">
                <SimpleMDE
                  value={editingValues.description || ''}
                  onChange={(val) => handleInputChange('description', val)}
                  options={mdeOptions}
                />
                <div className="flex gap-2 justify-end mt-1">
                  <button 
                    type="button" 
                    onClick={() => {
                      cancelFieldUpdate('description');
                      setIsEditingDescription(false);
                    }} 
                    className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSaveDescription} 
                    className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    <Check size={14} />
                    <span>Save Description</span>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setIsEditingDescription(true)}
                className="w-full overflow-hidden break-words border border-slate-100 hover:border-slate-300 hover:bg-slate-50 rounded p-4 bg-transparent text-slate-700 leading-relaxed cursor-text min-h-[100px] transition-all markdown-container"
                title="Click to edit description"
              >
                {task.description ? (
                  <Markdown 
				            remarkPlugins={[remarkBreaks]}
				            components={markdownComponents}>
                    {task.description}
                  </Markdown>
                ) : (
                  <span className="italic text-slate-400">Add a description...</span>
                )}
              </div>
            )}
          </div>

          {/* Linked Tasks */}
          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
              <span>Linked Tasks</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {task.subIssues ? task.subIssues.length : 0}
              </span>
            </h3>
            
            {task.subIssues && task.subIssues.length > 0 ? (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden bg-white shadow-xs">
                {task.subIssues.map((child) => (
                  <div 
                    key={child.id}
                    onClick={() => navigate(`/tasks/details?taskId=${child.id}`)}
                    className="flex items-center justify-between p-3 hover:bg-slate-50/80 cursor-pointer transition-colors text-xs group/item"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono font-bold text-blue-600 group-hover/item:underline flex-shrink-0">
                        TASK-{child.id}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border flex-shrink-0 ${COMPACT_TYPE_STYLES[child.taskType?.toUpperCase()] || COMPACT_TYPE_STYLES.DEFAULT}`}>
                        {child.taskType}
                      </span>
                      <span className="text-slate-800 font-medium truncate" title={child.title}>
                        {child.title}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold tracking-wide uppercase ${STATUS_STYLES[child.taskStatus] || STATUS_STYLES.DEFAULT}`}>
                        {child.taskStatus ? child.taskStatus.replace('_', ' ') : 'TO DO'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 text-xs italic py-2 pl-1">
                No active sub-issues linked.
              </div>
            )}
          </div>

          {/* Activity / Comments */}
          <div className="border-t border-slate-200 pt-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-semibold mb-2">
              <MessageSquare size={16} className="text-slate-600" />
              <h3>Activity / Comments</h3>
            </div>

            <form onSubmit={handleAddComment} className="flex gap-3 items-start">
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 mt-1">
                {(task.createdBy || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 flex flex-col gap-2 comment-editor-wrapper">
                <SimpleMDE
                  value={newComment}
                  onChange={(val) => setNewComment(val)}
                  options={mdeOptions}
                />
                {newComment.trim() && (
                  <div className="flex justify-end mt-1">
                    <button type="submit" disabled={savingComment} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded text-xs shadow-xs transition-colors cursor-pointer">
                      {savingComment ? 'Saving...' : 'Save Comment'}
                    </button>
                  </div>
                )}
              </div>
            </form>

            <div className="space-y-3 pt-2">
              {comments && comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3 bg-slate-50 p-3 rounded-lg border border-slate-150 relative group/comment">
                    <div className="h-7 w-7 rounded-full bg-slate-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                      {(comment.author || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-semibold text-slate-800">{comment.author}</span>
                        <span className="text-slate-400 font-normal">
                          {comment.timestamp ? new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                        {comment.updated && (
                          <span className="text-slate-400 bg-slate-200/60 px-1 py-0.2 rounded text-[9px] font-medium tracking-wide">
                            (Edited)
                          </span>
                        )}
                      </div>

                      {editingCommentId === comment.id ? (
                        <div className="comment-editor-wrapper pt-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <SimpleMDE
                            value={editingCommentText}
                            onChange={(val) => setEditingCommentText(val)}
                            options={mdeOptions}
                          />
                          <div className="flex justify-end gap-2 text-xs">
                            <button
                              type="button"
                              disabled={updatingComment}
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditingCommentText('');
                              }}
                              className="px-2.5 py-1 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded font-medium transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={updatingComment || !editingCommentText.trim()}
                              onClick={() => handleUpdateComment(comment.id)}
                              className="px-2.5 py-1 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 rounded font-medium transition-colors shadow-xs cursor-pointer"
                            >
                              {updatingComment ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => startEditingComment(comment)}
                          title="Click to edit comment"
                          className="text-xs text-slate-700 leading-relaxed markdown-container w-full overflow-hidden break-words cursor-pointer hover:bg-slate-100 p-1.5 rounded-md transition-colors"
                        >
                          <Markdown 
                            remarkPlugins={[remarkBreaks]}
                            components={markdownComponents}
                          >
                            {comment.comment}
                          </Markdown>
                        </div>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); 
                        handleDeleteComment(comment.id);
                      }}
                      className="absolute right-3 top-3 text-slate-300 hover:text-red-500 opacity-0 group-hover/comment:opacity-100 p-1 transition-all cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-xs italic py-4">No comments posted yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-80 border border-slate-200 rounded-lg p-4 bg-white space-y-4 shadow-sm h-fit relative">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-slate-900">Details</h3>
            {savingField && <span className="text-xs text-blue-500 animate-pulse">saving...</span>}
          </div>

          {/* STATUS SELECTOR */}
          <div className="pt-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={editingValues.taskStatus || 'TO_DO'}
                  onChange={(e) => handleInputChange('taskStatus', e.target.value)}
                  className={`w-full appearance-none bg-transparent border rounded px-3 py-2 text-xs font-bold tracking-wide outline-none cursor-pointer transition-all text-center ${STATUS_STYLES[editingValues.taskStatus] || STATUS_STYLES.DEFAULT}`}
                >
                  {(metadata.statuses || []).map(status => (
                    <option key={status} value={status} className="bg-white text-slate-800 font-medium text-left">{status.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              {editingValues.taskStatus !== task.taskStatus && (
                <button onClick={() => commitFieldUpdate('taskStatus')} className="p-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm cursor-pointer"><Check size={14} /></button>
              )}
            </div>
          </div>

          {/* PRIORITY SELECTOR */}
          <div className="pt-1">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={editingValues.priority || 'MEDIUM'}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className={`w-full appearance-none bg-transparent border rounded px-3 py-2 text-xs uppercase tracking-wider outline-none cursor-pointer transition-all text-center ${PRIORITY_STYLES[editingValues.priority] || PRIORITY_STYLES.DEFAULT}`}
                >
                  {(metadata.priorities || []).map(prio => (
                    <option key={prio} value={prio} className="bg-white text-slate-800 font-medium text-left">{prio.charAt(0) + prio.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              {editingValues.priority !== task.priority && (
                <button onClick={() => commitFieldUpdate('priority')} className="p-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm cursor-pointer"><Check size={14} /></button>
              )}
            </div>
          </div>

          {/* DYNAMIC ISSUE TYPE SELECTOR */}
          <div className="pt-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-left">Issue Type</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={editingValues.taskType || 'TASK'}
                  onChange={(e) => handleInputChange('taskType', e.target.value)}
                  className={`w-full appearance-none bg-transparent border rounded px-3 py-2 text-xs font-bold tracking-wide uppercase outline-none cursor-pointer transition-all text-center ${
                    editingValues.taskType === 'BUG' ? 'bg-red-50 text-red-700 border-red-200' :
                    editingValues.taskType === 'STORY' ? 'bg-green-50 text-green-700 border-green-200' :
                    editingValues.taskType === 'EPIC' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {(metadata.taskTypes || ['STORY', 'BUG', 'TASK', 'EPIC']).map(type => (
                    <option key={type} value={type} className="bg-white text-slate-800 font-medium text-left">
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              {editingValues.taskType !== task.taskType && (
                <button 
                  onClick={() => commitFieldUpdate('taskType')} 
                  className="p-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm h-full flex items-center justify-center cursor-pointer"
                >
                  <Check size={14} />
                </button>
              )}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Link Issues */}
          <div className="pt-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-left">
              Link Issues / Hierarchy
            </label>
            <form onSubmit={handleLinkTaskSubmit} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Enter Jira ID (e.g. 14)"
                  value={linkSearchQuery}
                  required
                  onChange={(e) => {
                    setLinkSearchQuery(e.target.value);
                    setLinkingTaskId(e.target.value);
                  }}
                  className="flex-1 border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-medium text-xs bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={!linkingTaskId || isLinking}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded text-xs transition-all cursor-pointer shadow-xs whitespace-nowrap"
                >
                  {isLinking ? 'Linking...' : 'Link'}
                </button>
              </div>
            </form>
          </div>

          <hr className="border-slate-100" />

          {/* ASSIGNEE INPUT */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Assignee</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingValues.assignee || ''}
                placeholder="Unassigned"
                onChange={(e) => handleInputChange('assignee', e.target.value)}
                className="flex-1 border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-medium text-xs"
              />
              {editingValues.assignee !== task.assignee && (
                <button onClick={() => commitFieldUpdate('assignee')} className="p-2 bg-green-600 text-white rounded hover:bg-green-700 h-full cursor-pointer"><Check size={14} /></button>
              )}
            </div>
          </div>

          {/* REPORTER INPUT */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reporter</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingValues.reporter || ''}
                placeholder="System"
                onChange={(e) => handleInputChange('reporter', e.target.value)}
                className="flex-1 border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-medium text-xs"
              />
              {editingValues.reporter !== task.reporter && (
                <button onClick={() => commitFieldUpdate('reporter')} className="p-2 bg-green-600 text-white rounded hover:bg-green-700 h-full cursor-pointer"><Check size={14} /></button>
              )}
            </div>
          </div>

          {/* Delete Task Button */}
          <div className="pt-4 mt-4 border-t border-slate-100">
            <button 
              onClick={() => setShowDeleteModal(true)} 
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-100 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Delete Issue</span>
            </button>
          </div>
		  
        </div>
      </div>

      {/* FLOATING MODAL CONFIRMATION WINDOW */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 text-left transform scale-100 transition-all space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 rounded-full text-red-600 flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900">Delete Issue TASK-{taskId}?</h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Are you absolutely sure you want to drop this issue blueprint from the project tracking catalog? This action is permanent and cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button 
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={isDeleting}
                onClick={executeDeleteTask}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 transition-colors rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODERN FLOATING TOAST POP-UP WINDOW */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-xs font-medium tracking-wide ${
            toastType === 'success' 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {toastType === 'success' ? (
              <Check size={16} className="text-green-600 flex-shrink-0" />
            ) : (
              <X size={16} className="text-red-600 flex-shrink-0" />
            )}
            <span>{toastMessage}</span>
            <button 
              type="button" 
              onClick={() => setToastMessage(null)} 
              className="ml-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}