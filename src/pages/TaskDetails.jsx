import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown'; 
import SimpleMDE from 'react-simplemde-editor'; 
import 'easymde/dist/easymde.min.css';      
import remarkBreaks from 'remark-breaks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';  
import { API_BASE_URL } from '../config/api';

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

import { 
  ChevronRight, 
  Check, 
  X, 
  Trash2, 
  Bug,          
  Bookmark,     
  CheckSquare,  
  MessageSquare, 
  Zap,
  AlertTriangle,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  Equal,
  AlertCircle,
  Lock
} from 'lucide-react';

const PRIORITY_CONFIG = {
  LOW: {
    label: 'Low',
    style: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-semibold',
    icon: <ChevronDown size={14} className="text-blue-600 font-bold stroke-[3]" />
  },
  MEDIUM: {
    label: 'Medium',
    style: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-semibold',
    icon: <Equal size={13} className="text-amber-600 font-bold stroke-[3]" />
  },
  HIGH: {
    label: 'High',
    style: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 font-bold',
    icon: <ChevronUp size={14} className="text-orange-600 font-extrabold stroke-[3]" />
  },
  HIGHEST: {
    label: 'Highest',
    style: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 font-bold',
    icon: <ChevronsUp size={15} className="text-red-600 font-extrabold stroke-[3]" />
  },
  CRITICAL: {
    label: 'Critical',
    style: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200 font-extrabold animate-pulse',
    icon: <AlertCircle size={13} className="text-red-600 fill-red-100 font-extrabold" />
  },
  DEFAULT: {
    label: 'Medium',
    style: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-semibold',
    icon: <Equal size={13} className="text-amber-600 font-bold stroke-[3]" />
  }
};

const STATUS_STYLES = {
  TO_DO: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  DONE: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  DEFAULT: 'bg-slate-50 text-slate-600 border-slate-200'
};

const TYPE_STYLES = {
  STORY: 'bg-green-600 text-white border-transparent',
  BUG: 'bg-red-600 text-white border-transparent',
  TASK: 'bg-blue-500 text-white border-transparent',
  EPIC: 'bg-purple-600 text-white border-transparent',
  SUB_TASK: 'bg-teal-600 text-white border-transparent',
  DEFAULT: 'bg-slate-500 text-white border-transparent'
};

const COMPACT_TYPE_STYLES = {
  STORY: 'bg-green-50 text-green-700 border-green-200',
  BUG: 'bg-red-50 text-red-700 border-red-200',
  TASK: 'bg-blue-50 text-blue-700 border-blue-200',
  EPIC: 'bg-purple-50 text-purple-700 border-purple-200',
  SUB_TASK: 'bg-teal-50 text-teal-700 border-teal-200',
  DEFAULT: 'bg-slate-50 text-slate-700 border-slate-200'
};

const TYPE_ICONS = {
  STORY: <Bookmark size={12} className="fill-current text-white mr-1.5" />,
  BUG: <Bug size={12} className="text-white mr-1.5" />,
  TASK: <CheckSquare size={12} className="text-white mr-1.5" />,
  EPIC: <Zap size={12} className="fill-current text-white mr-1.5" />,
  SUB_TASK: <CheckSquare size={12} className="text-white mr-1.5" />,
  DEFAULT: <CheckSquare size={12} className="text-white mr-1.5" />
};

// 🔒 Compact Avatar Lock Badge Component
const LockBadge = ({ lockInfo, fieldName }) => {
  if (!lockInfo) return null;

  // Supports both object payload { name, avatar } and legacy string fallback
  const userName = typeof lockInfo === 'object' ? lockInfo.name : lockInfo;
  const userAvatar = typeof lockInfo === 'object' ? lockInfo.avatar : null;
  const initial = userName ? userName.trim().charAt(0).toUpperCase() : 'U';

  return (
    <div 
      className="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse shadow-2xs cursor-help select-none"
      title={`${userName} is currently editing ${fieldName}`}
    >
      <Lock size={10} className="text-amber-600 flex-shrink-0" />
      <div className="h-4 w-4 rounded-full overflow-hidden border border-amber-300 bg-amber-600 text-white font-bold flex items-center justify-center text-[9px] uppercase shadow-inner flex-shrink-0">
        {userAvatar && userAvatar !== 'null' && userAvatar !== 'undefined' ? (
          <img 
            src={userAvatar} 
            alt={userName} 
            className="h-full w-full object-cover" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
        ) : (
          initial
        )}
      </div>
    </div>
  );
};

export default function TaskDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const taskId = params.get('taskId');

  const titleRef = useRef(null); 
  const userDropdownRef = useRef(null); 
  const inlineMenuRef = useRef(null);
  const stompClientRef = useRef(null);

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState(null);
  const [editingValues, setEditingValues] = useState({});
  const [lockedFields, setLockedFields] = useState({}); // { fieldName: { name, avatar } }
  
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

  // Sub-task creation states
  const [showSubTaskInput, setShowSubTaskInput] = useState(false);
  const [subTaskTitle, setSubTaskTitle] = useState('');
  const [creatingSubTask, setCreatingSubTask] = useState(false);

  // Dynamic Interactive Dropdown States
  const [activeInlineMenu, setActiveInlineMenu] = useState(null); 
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [syncingSubTaskId, setSyncingSubTaskId] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('error');
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [metadata, setMetadata] = useState({
    statuses: ['TO_DO', 'IN_PROGRESS', 'DONE'],
    priorities: ['LOW', 'MEDIUM', 'HIGH', 'HIGHEST', 'CRITICAL'],
    taskTypes: ['STORY', 'BUG', 'TASK', 'EPIC', 'SUB_TASK']
  });

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

  const userEmail = useMemo(() => {
    return parsedUserData?.email || localStorage.getItem('jira_user_email') || 'user@example.com';
  }, [parsedUserData]);

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

  // Broadcast lock events with avatarUrl over STOMP
  const broadcastLock = (fieldName, isLocking) => {
    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({
        destination: `/app/tasks/${taskId}/lock`,
        body: JSON.stringify({
          fieldName,
          user: displayUserName,
          avatarUrl: avatarUrl,
          type: isLocking ? 'FIELD_LOCK' : 'FIELD_UNLOCK'
        })
      });
    }
  };

 // 📡 WebSocket Initialization for Real-Time Lock & Update Sync
useEffect(() => {
  if (!taskId) return;

  const baseWsUrl = API_BASE_URL.replace('/api', '');
  const socket = new SockJS(`${baseWsUrl}/ws`);
  const client = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000,
    onConnect: () => {
      client.subscribe(`/topic/tasks/${taskId}`, (message) => {
        const payload = JSON.parse(message.body);
        console.log("📡 Received STOMP payload on Laptop:", payload); // 👈 Check Dev Console (F12)

        if (payload.type === 'FIELD_LOCK') {
          if (payload.user !== displayUserName) {
            setLockedFields(prev => ({ 
              ...prev, 
              [payload.fieldName]: { name: payload.user, avatar: payload.avatarUrl } 
            }));
          }
        } else if (payload.type === 'FIELD_UNLOCK') {
          setLockedFields(prev => ({ ...prev, [payload.fieldName]: null }));
        } else if (payload.type === 'FIELD_UPDATE' || payload.fields) {
          const fieldUpdates = payload.fields || {};

          setTask(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              ...fieldUpdates,
              // Normalize status key in case backend/DTO sends taskStatus vs status
              ...(fieldUpdates.taskStatus && { taskStatus: fieldUpdates.taskStatus, status: fieldUpdates.taskStatus }),
              ...(fieldUpdates.status && { taskStatus: fieldUpdates.status, status: fieldUpdates.status })
            };
          });

          setEditingValues(prev => ({
            ...prev,
            ...fieldUpdates,
            ...(fieldUpdates.taskStatus && { taskStatus: fieldUpdates.taskStatus, status: fieldUpdates.taskStatus }),
            ...(fieldUpdates.status && { taskStatus: fieldUpdates.status, status: fieldUpdates.status })
          }));
        }
      });
    }
  });

  client.activate();
  stompClientRef.current = client;

  return () => {
    if (client.connected) {
      client.deactivate();
    }
  };
}, [taskId, displayUserName]);

  useEffect(() => {
    if (!taskId) return;

    const fetchTaskPromise = fetch(`${API_BASE_URL}/api/tasks/get/created-task?taskId=${taskId}`, {
      headers: getAuthHeaders()
    }).then((res) => {
      if (res.status === 401) { handleLogout(); throw new Error("Unauthorized"); }
      if (!res.ok) throw new Error("Task not found");
      return res.json();
    }).then((data) => data.tasks || data);

    const fetchMetadataPromise = fetch(`${API_BASE_URL}/api/tasks/config`, {
      headers: getAuthHeaders()
    }).then((res) => res.ok ? res.json() : null).catch(() => null);

    const fetchCommentsPromise = fetch(`${API_BASE_URL}/api/comments/task/${taskId}`, {
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (inlineMenuRef.current && !inlineMenuRef.current.contains(event.target)) {
        setActiveInlineMenu(null);
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

    const payload = {
      taskId: parseInt(taskId),
      fields: { [fieldName]: newValue },
      emailId: userEmail
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/update/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        handleLogout();
        return false;
      }

      if (response.ok) {
        const updatedTask = await response.json();
        setTask(updatedTask);
        setEditingValues(updatedTask);
        broadcastLock(fieldName, false); // Unlock field after commit
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

  const triggerInlineMenuContainer = (e, subTaskId, fieldType) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    
    setMenuPosition({
      top: rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - 160)
    });
    
    setActiveInlineMenu(activeInlineMenu?.subTaskId === subTaskId && activeInlineMenu?.fieldType === fieldType 
      ? null 
      : { subTaskId, fieldType }
    );
  };

  const executeInlineSubTaskMutation = async (subTaskId, fieldName, targetValue) => {
    setSyncingSubTaskId(subTaskId);
    setActiveInlineMenu(null);

    const payloadKey = fieldName === 'status' ? 'taskStatus' : fieldName;
    const payload = {
      taskId: parseInt(subTaskId),
      fields: { [payloadKey]: targetValue },
      emailId: userEmail
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/update/${subTaskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        const updatedSubTask = await response.json();
        setTask(prev => ({
          ...prev,
          subIssues: (prev.subIssues || []).map(sub => 
            sub.id === subTaskId ? { ...sub, ...updatedSubTask, [payloadKey]: targetValue } : sub
          )
        }));
        showToast(`Sub-task ${fieldName} updated to ${targetValue}!`, "success");
      } else {
        showToast("Failed to update sub-task on server.", "error");
      }
    } catch (error) {
      console.error("Error updating sub-task:", error);
      showToast("Network exception updating sub-task.", "error");
    } finally {
      setSyncingSubTaskId(null);
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
    broadcastLock(fieldName, false);
    setTimeout(() => {
      if (fieldName === 'title') autoResizeTitle();
    }, 50);
  };
  
  const executeDeleteTask = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/delete/${taskId}`, {
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
      const response = await fetch(`${API_BASE_URL}/api/tasks/link-tasks`, {
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

  const handleCreateSubTask = async (e) => {
    e.preventDefault();
    if (!subTaskTitle.trim() || creatingSubTask) return;

    setCreatingSubTask(true);

    const payload = {
      currentTaskId: parseInt(taskId),
      title: subTaskTitle.trim(),
      taskType: "SUB_TASK"
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/create/sub-task`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        const createdSubTaskDto = await response.json();
        
        setTask(prev => ({
          ...prev,
          subIssues: [...(prev.subIssues || []), createdSubTaskDto]
        }));

        setSubTaskTitle('');
        setShowSubTaskInput(false);
        showToast("Sub-task created successfully!", "success");
      } else {
        showToast("Failed to create sub-task.", "error");
      }
    } catch (error) {
      console.error("Error creating sub-task:", error);
      showToast("Network exception failed to create sub-task.", "error");
    } finally {
      setCreatingSubTask(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || savingComment) return;

    setSavingComment(true);

    const payload = {
      taskId: parseInt(taskId),          
      comment: newComment.trim(),        
      author: displayUserName
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/comments/save`, {
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
      const response = await fetch(`${API_BASE_URL}/api/comments/update`, {
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

  if (loading) return <div className="p-8 text-slate-500 text-left">Loading task context...</div>;
  if (!task) return <div className="p-8 text-red-500 text-left">Task details unavailable.</div>;

  const currentTaskType = (task.taskType || 'TASK').toUpperCase();

  return (
    <div className="min-h-screen w-screen bg-white font-sans text-sm text-slate-800 text-left mb-12 relative">
      
      {/* Interactive Breadcrumb Bar */}
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

        {/* Profile Avatar Header */}
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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Summary / Title</label>
              <LockBadge lockInfo={lockedFields.title} fieldName="title" />
            </div>
            <div className="flex items-start gap-2">
              <textarea
                ref={titleRef}
                rows="1"
                disabled={!!lockedFields.title}
                onFocus={() => broadcastLock('title', true)}
                onBlur={() => broadcastLock('title', false)}
                value={editingValues.title || ''}
                onInput={autoResizeTitle}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`text-2xl font-semibold leading-tight w-full border rounded px-2 py-1 outline-none transition-all resize-none overflow-hidden h-auto ${
                  lockedFields.title 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 opacity-70' 
                    : 'bg-transparent border-transparent hover:border-slate-200 focus:border-blue-500 text-slate-900 focus:bg-white'
                }`}
              />
              {editingValues.title !== task.title && !lockedFields.title && (
                <div className="flex gap-1 pt-1">
                  <button onClick={() => commitFieldUpdate('title')} className="p-1 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"><Check size={16} /></button>
                  <button onClick={() => cancelFieldUpdate('title')} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 cursor-pointer"><X size={16} /></button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-slate-900 font-semibold">Description</h3>
              <LockBadge lockInfo={lockedFields.description} fieldName="description" />
            </div>
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
                onClick={() => {
                  if (!lockedFields.description) {
                    setIsEditingDescription(true);
                    broadcastLock('description', true);
                  }
                }}
                className={`w-full overflow-hidden break-words border rounded p-4 text-slate-700 leading-relaxed min-h-[100px] transition-all markdown-container ${
                  lockedFields.description 
                    ? 'bg-slate-100/80 cursor-not-allowed border-slate-200 opacity-60' 
                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-text'
                }`}
                title={lockedFields.description ? `Locked by ${typeof lockedFields.description === 'object' ? lockedFields.description.name : lockedFields.description}` : "Click to edit description"}
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

          {/* Child Issues / Sub-Tasks */}
          <div className="border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-900 font-semibold flex items-center gap-2">
                <span>Child Issues / Sub-Tasks</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {task.subIssues ? task.subIssues.length : 0}
                </span>
              </h3>

              <button
                type="button"
                onClick={() => setShowSubTaskInput(prev => !prev)}
                className="p-1.5 rounded bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold px-2.5 border border-slate-200"
                title="Create Sub-Task"
              >
                <Plus size={14} />
                <span>Create Sub-Task</span>
              </button>
            </div>

            {showSubTaskInput && (
              <form onSubmit={handleCreateSubTask} className="mb-3 flex items-center gap-2 animate-in fade-in duration-150 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <input
                  type="text"
                  placeholder="What needs to be done? Enter sub-task title..."
                  value={subTaskTitle}
                  onChange={(e) => setSubTaskTitle(e.target.value)}
                  autoFocus
                  className="flex-1 border border-blue-400 focus:ring-2 focus:ring-blue-500/20 rounded px-3 py-1.5 text-xs text-slate-800 outline-none bg-white shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!subTaskTitle.trim() || creatingSubTask}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium rounded text-xs transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0"
                >
                  <Check size={14} />
                  <span>{creatingSubTask ? 'Creating...' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubTaskInput(false);
                    setSubTaskTitle('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </form>
            )}

            {task.subIssues && task.subIssues.length > 0 ? (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden bg-white shadow-xs">
                {task.subIssues.map((child) => (
                  <div 
                    key={child.id}
                    onClick={() => navigate(`/tasks/details?taskId=${child.id}`)}
                    className="flex items-center justify-between p-3 hover:bg-slate-50/80 cursor-pointer transition-colors text-xs group/item gap-4"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="font-mono font-bold text-blue-600 group-hover/item:underline flex-shrink-0 w-16">
                        TASK-{child.id}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border flex-shrink-0 ${COMPACT_TYPE_STYLES[child.taskType?.toUpperCase()] || COMPACT_TYPE_STYLES.DEFAULT}`}>
                        {child.taskType || 'SUB_TASK'}
                      </span>
                      <span className="text-slate-800 font-medium truncate select-text flex-1" title={child.title}>
                        {child.title}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="w-28 flex justify-end">
                        {syncingSubTaskId === child.id ? (
                          <span className="text-[10px] text-slate-400 animate-pulse">Saving...</span>
                        ) : (() => {
                          const rawPriority = child.priority || child.taskPriority;
                          const prioKey = rawPriority ? String(rawPriority).toUpperCase() : 'MEDIUM';
                          const prioConfig = PRIORITY_CONFIG[prioKey] || PRIORITY_CONFIG.MEDIUM || PRIORITY_CONFIG.DEFAULT;

                          return (
                            <button
                              type="button"
                              onClick={(e) => triggerInlineMenuContainer(e, child.id, 'priority')}
                              className={`w-full inline-flex items-center justify-between px-2 py-1 rounded border text-[10px] uppercase shadow-2xs cursor-pointer transition-all ${prioConfig.style}`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {prioConfig.icon}
                                <span className="truncate">{prioConfig.label}</span>
                              </div>
                              <ChevronDown size={10} className="opacity-60 flex-shrink-0 ml-1" />
                            </button>
                          );
                        })()}
                      </div>

                      <div className="w-30 flex justify-end">
                        {syncingSubTaskId === child.id ? (
                          <span className="text-[10px] text-slate-400 animate-pulse">Saving...</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => triggerInlineMenuContainer(e, child.id, 'status')}
                            className={`w-full inline-flex items-center justify-between px-2 py-1 rounded border text-[9px] font-bold tracking-wide uppercase shadow-2xs cursor-pointer transition-all ${STATUS_STYLES[child.taskStatus?.toUpperCase()] || STATUS_STYLES.DEFAULT}`}
                          >
                            <span className="truncate">{(child.taskStatus || 'TO_DO').replace('_', ' ')}</span>
                            <ChevronDown size={10} className="opacity-60 flex-shrink-0 ml-1" />
                          </button>
                        )}
                      </div>
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
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 mt-1 overflow-hidden shadow-xs">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayUserName} className="h-full w-full object-cover" />
                ) : (
                  displayUserName.charAt(0).toUpperCase()
                )}
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
                comments.map(comment => {
                  const isCurrentAuthorLoggedIn = comment.author === displayUserName;
                  const commentAvatar = isCurrentAuthorLoggedIn ? avatarUrl : null;
                  const commentAuthorName = comment.author || 'User';

                  return (
                    <div key={comment.id} className="flex gap-3 bg-slate-50 p-3 rounded-lg border border-slate-150 relative group/comment">
                      <div className="h-7 w-7 rounded-full bg-slate-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 overflow-hidden shadow-xs">
                        {commentAvatar ? (
                          <img 
                            src={commentAvatar} 
                            alt={commentAuthorName} 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(commentAuthorName)}&background=2563eb&color=fff`;
                            }}
                          />
                        ) : (
                          commentAuthorName.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-semibold text-slate-800">{commentAuthorName}</span>
                          <span className="text-slate-400 font-normal">Just now</span>
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
                            <Markdown remarkPlugins={[remarkBreaks]} components={markdownComponents}>
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
                  );
                })
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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
              <LockBadge lockInfo={lockedFields.taskStatus} fieldName="status" />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  disabled={!!lockedFields.taskStatus}
                  onFocus={() => broadcastLock('taskStatus', true)}
                  onBlur={() => broadcastLock('taskStatus', false)}
                  value={editingValues.taskStatus || 'TO_DO'}
                  onChange={(e) => handleInputChange('taskStatus', e.target.value)}
                  className={`w-full appearance-none border rounded px-3 py-2 text-xs font-bold tracking-wide outline-none transition-all text-center ${
                    lockedFields.taskStatus 
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                      : `${STATUS_STYLES[editingValues.taskStatus] || STATUS_STYLES.DEFAULT} cursor-pointer`
                  }`}
                >
                  {(metadata.statuses || []).map(status => (
                    <option key={status} value={status} className="bg-white text-slate-800 font-medium text-left">{status.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              {editingValues.taskStatus !== task.taskStatus && !lockedFields.taskStatus && (
                <button onClick={() => commitFieldUpdate('taskStatus')} className="p-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm cursor-pointer"><Check size={14} /></button>
              )}
            </div>
          </div>

          {/* PRIORITY SELECTOR */}
          <div className="pt-1">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</label>
              <LockBadge lockInfo={lockedFields.priority} fieldName="priority" />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  disabled={!!lockedFields.priority}
                  onFocus={() => broadcastLock('priority', true)}
                  onBlur={() => broadcastLock('priority', false)}
                  value={editingValues.priority || 'MEDIUM'}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className={`w-full appearance-none border rounded px-3 py-2 text-xs uppercase tracking-wider outline-none transition-all text-center ${
                    lockedFields.priority 
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                      : `${PRIORITY_CONFIG[editingValues.priority?.toUpperCase()]?.style || PRIORITY_CONFIG.DEFAULT.style} cursor-pointer`
                  }`}
                >
                  {(metadata.priorities || []).map(prio => (
                    <option key={prio} value={prio} className="bg-white text-slate-800 font-medium text-left">{prio.charAt(0) + prio.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              {editingValues.priority !== task.priority && !lockedFields.priority && (
                <button onClick={() => commitFieldUpdate('priority')} className="p-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm cursor-pointer"><Check size={14} /></button>
              )}
            </div>
          </div>

          {/* DYNAMIC ISSUE TYPE SELECTOR */}
          <div className="pt-1">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Type</label>
              <LockBadge lockInfo={lockedFields.taskType} fieldName="issue type" />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  disabled={!!lockedFields.taskType}
                  onFocus={() => broadcastLock('taskType', true)}
                  onBlur={() => broadcastLock('taskType', false)}
                  value={editingValues.taskType || 'TASK'}
                  onChange={(e) => handleInputChange('taskType', e.target.value)}
                  className={`w-full appearance-none border rounded px-3 py-2 text-xs font-bold tracking-wide uppercase outline-none transition-all text-center ${
                    lockedFields.taskType 
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                      : `${
                          editingValues.taskType === 'BUG' ? 'bg-red-50 text-red-700 border-red-200' :
                          editingValues.taskType === 'STORY' ? 'bg-green-50 text-green-700 border-green-200' :
                          editingValues.taskType === 'EPIC' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          editingValues.taskType === 'SUB_TASK' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        } cursor-pointer`
                  }`}
                >
                  {(metadata.taskTypes || ['STORY', 'BUG', 'TASK', 'EPIC', 'SUB_TASK']).map(type => (
                    <option key={type} value={type} className="bg-white text-slate-800 font-medium text-left">
                      {type.replace('_', ' ').charAt(0) + type.replace('_', ' ').slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              {editingValues.taskType !== task.taskType && !lockedFields.taskType && (
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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Assignee</label>
              <LockBadge lockInfo={lockedFields.assignee} fieldName="assignee" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled={!!lockedFields.assignee}
                onFocus={() => broadcastLock('assignee', true)}
                onBlur={() => broadcastLock('assignee', false)}
                value={editingValues.assignee || ''}
                placeholder="Unassigned"
                onChange={(e) => handleInputChange('assignee', e.target.value)}
                className={`flex-1 border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium ${
                  lockedFields.assignee 
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                    : 'border-slate-300 text-slate-800'
                }`}
              />
              {editingValues.assignee !== task.assignee && !lockedFields.assignee && (
                <button onClick={() => commitFieldUpdate('assignee')} className="p-2 bg-green-600 text-white rounded hover:bg-green-700 h-full cursor-pointer"><Check size={14} /></button>
              )}
            </div>
          </div>

          {/* REPORTER INPUT */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Reporter</label>
              <LockBadge lockInfo={lockedFields.reporter} fieldName="reporter" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled={!!lockedFields.reporter}
                onFocus={() => broadcastLock('reporter', true)}
                onBlur={() => broadcastLock('reporter', false)}
                value={editingValues.reporter || ''}
                placeholder="System"
                onChange={(e) => handleInputChange('reporter', e.target.value)}
                className={`flex-1 border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium ${
                  lockedFields.reporter 
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                    : 'border-slate-300 text-slate-800'
                }`}
              />
              {editingValues.reporter !== task.reporter && !lockedFields.reporter && (
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

      {activeInlineMenu && (
        <div 
          ref={inlineMenuRef}
          onClick={(e) => e.stopPropagation()}
          className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-50 min-w-[150px] max-w-xs animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`
          }}
        >
          <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100 mb-0.5 tracking-wider">
            Select {activeInlineMenu.fieldType}
          </div>

          {activeInlineMenu.fieldType === 'status' && 
            (metadata.statuses || ['TO_DO', 'IN_PROGRESS', 'DONE']).map(opt => (
              <button
                key={opt}
                onClick={() => executeInlineSubTaskMutation(activeInlineMenu.subTaskId, 'status', opt)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span className={`w-2 h-2 rounded-full ${
                  opt === 'DONE' ? 'bg-green-500' : opt === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-400'
                }`} />
                <span>{opt.replace('_', ' ')}</span>
              </button>
            ))
          }

          {activeInlineMenu.fieldType === 'priority' && 
            (metadata.priorities || ['LOW', 'MEDIUM', 'HIGH', 'HIGHEST', 'CRITICAL']).map(opt => {
              const config = PRIORITY_CONFIG[opt.toUpperCase()] || PRIORITY_CONFIG.DEFAULT;
              return (
                <button
                  key={opt}
                  onClick={() => executeInlineSubTaskMutation(activeInlineMenu.subTaskId, 'priority', opt)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <span className="capitalize">{config.label}</span>
                  </div>
                </button>
              );
            })
          }
        </div>
      )}

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

      {/* FLOATING TOAST POP-UP WINDOW */}
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