import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown'; 
import SimpleMDE from 'react-simplemde-editor';      
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
  Lock,
  User,
  GitPullRequest,
  RefreshCw
} from 'lucide-react';

const PRIORITY_CONFIG = {
  LOW: {
    label: 'Low',
    style: 'bg-blue-950/50 text-blue-300 border-blue-800 font-semibold',
    icon: <ChevronDown size={12} className="text-blue-400 font-bold stroke-[3]" />
  },
  MEDIUM: {
    label: 'Medium',
    style: 'bg-amber-950/50 text-amber-300 border-amber-800 font-semibold',
    icon: <Equal size={11} className="text-amber-400 font-bold stroke-[3]" />
  },
  HIGH: {
    label: 'High',
    style: 'bg-orange-950/50 text-orange-300 border-orange-800 font-bold',
    icon: <ChevronUp size={12} className="text-orange-400 font-extrabold stroke-[3]" />
  },
  HIGHEST: {
    label: 'Highest',
    style: 'bg-red-950/50 text-red-300 border-red-800 font-bold',
    icon: <ChevronsUp size={13} className="text-red-400 font-extrabold stroke-[3]" />
  },
  CRITICAL: {
    label: 'Critical',
    style: 'bg-red-900/60 text-red-200 border-red-700 font-extrabold animate-pulse',
    icon: <AlertCircle size={11} className="text-red-400 fill-red-900 font-extrabold" />
  },
  DEFAULT: {
    label: 'Medium',
    style: 'bg-amber-950/50 text-amber-300 border-amber-800 font-semibold',
    icon: <Equal size={11} className="text-amber-400 font-bold stroke-[3]" />
  }
};

const STATUS_STYLES = {
  TO_DO: 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700',
  IN_PROGRESS: 'bg-blue-950/50 text-blue-300 border-blue-800',
  DONE: 'bg-green-950/50 text-green-300 border-green-800',
  DEFAULT: 'bg-slate-800 text-slate-400 border-slate-700'
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
  STORY: 'bg-green-950/40 text-green-300 border-green-800',
  BUG: 'bg-red-950/40 text-red-300 border-red-800',
  TASK: 'bg-blue-950/40 text-blue-300 border-blue-800',
  EPIC: 'bg-purple-950/40 text-purple-300 border-purple-800',
  SUB_TASK: 'bg-teal-950/40 text-teal-300 border-teal-800',
  DEFAULT: 'bg-slate-800 text-slate-300 border-slate-700'
};

const TYPE_ICONS = {
  STORY: <Bookmark size={12} className="fill-current text-white mr-1.5" />,
  BUG: <Bug size={12} className="text-white mr-1.5" />,
  TASK: <CheckSquare size={12} className="text-white mr-1.5" />,
  EPIC: <Zap size={12} className="fill-current text-white mr-1.5" />,
  SUB_TASK: <CheckSquare size={12} className="text-white mr-1.5" />,
  DEFAULT: <CheckSquare size={12} className="text-white mr-1.5" />
};

const UserAvatar = ({ rawString, fallbackAvatarUrl, size = "w-6 h-6" }) => {
  const [imgError, setImgError] = useState(false);

  if (!rawString || rawString.trim() === '') {
    return (
      <div className={`${size} rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 flex-shrink-0`}>
        <User size={12} />
      </div>
    );
  }

  const parts = rawString.split('|');
  const cleanName = parts[0] ? parts[0].trim() : '';
  const parsedAvatarUrl = parts[1] && parts[1].trim() !== '' && parts[1] !== 'null' && parts[1] !== 'undefined'
    ? parts[1].trim() 
    : fallbackAvatarUrl;

  const initial = cleanName ? cleanName.charAt(0).toUpperCase() : 'U';

  if (parsedAvatarUrl && !imgError) {
    return (
      <img 
        src={parsedAvatarUrl} 
        alt={cleanName} 
        className={`${size} rounded-full object-cover border border-slate-600 shadow-2xs flex-shrink-0`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div 
      className={`${size} rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] uppercase shadow-2xs flex-shrink-0 border border-blue-700`}
      title={cleanName}
    >
      {initial}
    </div>
  );
};

const LockBadge = ({ lockInfo, fieldName }) => {
  if (!lockInfo) return null;

  const userName = typeof lockInfo === 'object' ? lockInfo.name : lockInfo;
  const userAvatar = typeof lockInfo === 'object' ? lockInfo.avatar : null;
  const initial = userName ? userName.trim().charAt(0).toUpperCase() : 'U';

  return (
    <div 
      className="inline-flex items-center gap-1 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800 animate-pulse shadow-2xs cursor-help select-none"
      title={`${userName} is currently editing ${fieldName}`}
    >
      <Lock size={10} className="text-amber-400 flex-shrink-0" />
      <div className="h-4 w-4 rounded-full overflow-hidden border border-amber-700 bg-amber-600 text-white font-bold flex items-center justify-center text-[9px] uppercase shadow-inner flex-shrink-0">
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
  const [lockedFields, setLockedFields] = useState({});

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

  const [showSubTaskInput, setShowSubTaskInput] = useState(false);
  const [subTaskTitle, setSubTaskTitle] = useState('');
  const [creatingSubTask, setCreatingSubTask] = useState(false);

  const [pullRequests, setPullRequests] = useState([]);
  const [loadingPrs, setLoadingPrs] = useState(false);

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
          <code className="bg-slate-800 text-slate-200 font-mono text-[11px] px-1.5 py-0.5 rounded mx-0.5 break-words" {...props}>
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

  const fetchGithubPRs = async () => {
    setLoadingPrs(true);
    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({
        destination: `/app/tasks/${taskId}/fetch-prs`,
        body: JSON.stringify({})
      });
    } else {
      try {
        const response = await fetch(`${API_BASE_URL}/api/github/prs/${taskId}`, {
          headers: getAuthHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          setPullRequests(data || []);
        }
      } catch (err) {
        console.error("Error fetching PRs manually:", err);
      } finally {
        setLoadingPrs(false);
      }
    }
  };

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
                ...(fieldUpdates.taskStatus && { taskStatus: fieldUpdates.taskStatus, status: fieldUpdates.taskStatus }),
                ...(fieldUpdates.status && { taskStatus: fieldUpdates.status, status: fieldUpdates.status }),
                ...(fieldUpdates.priority && { priority: fieldUpdates.priority }),
                ...(fieldUpdates.taskType && { taskType: fieldUpdates.taskType })
              };
            });

            setEditingValues(prev => ({
              ...prev,
              ...fieldUpdates,
              ...(fieldUpdates.taskStatus && { taskStatus: fieldUpdates.taskStatus, status: fieldUpdates.taskStatus }),
              ...(fieldUpdates.status && { taskStatus: fieldUpdates.status, status: fieldUpdates.status }),
              ...(fieldUpdates.priority && { priority: fieldUpdates.priority }),
              ...(fieldUpdates.taskType && { taskType: fieldUpdates.taskType })
            }));
          } else if (payload.type === 'PR_FETCH_COMPLETE') {
            setPullRequests(payload.pullRequests || []);
            setLoadingPrs(false);
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

    const fetchPrsPromise = fetch(`${API_BASE_URL}/api/github/prs/${taskId}`, {
      headers: getAuthHeaders()
    }).then((res) => res.ok ? res.json() : []).catch(() => []);

    Promise.all([fetchTaskPromise, fetchMetadataPromise, fetchCommentsPromise, fetchPrsPromise])
      .then(([taskData, metaData, commentData, prData]) => {
        setTask(taskData);
        setEditingValues(taskData); 
        if (metaData) setMetadata(metaData);
        setComments(commentData || []);
        setPullRequests(prData || []);
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
    const rawValue = editingValues[fieldName];
    const cleanValue = typeof rawValue === 'string' ? rawValue.split('|')[0] : rawValue;
    setSavingField(fieldName);

    const payload = {
      taskId: parseInt(taskId),
      fields: { [fieldName]: cleanValue },
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
        broadcastLock(fieldName, false);
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

  const triggerInlineMenuContainer = (e, targetId, fieldType) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuEstimatedHeight = 180;
    const menuWidth = 145;

    let calculatedTop = rect.bottom + 4;
    if (rect.bottom + menuEstimatedHeight > window.innerHeight) {
      calculatedTop = Math.max(10, rect.top - menuEstimatedHeight - 4);
    }

    let calculatedLeft = rect.left;
    if (calculatedLeft + menuWidth > window.innerWidth) {
      calculatedLeft = window.innerWidth - menuWidth - 16;
    }

    setMenuPosition({
      top: calculatedTop,
      left: Math.max(10, calculatedLeft)
    });
    
    setActiveInlineMenu(activeInlineMenu?.targetId === targetId && activeInlineMenu?.fieldType === fieldType 
      ? null 
      : { targetId, fieldType }
    );
  };

  const executeParentTaskMutation = async (fieldName, targetValue) => {
    setActiveInlineMenu(null);
    handleInputChange(fieldName, targetValue);
    setSavingField(fieldName);

    const payload = {
      taskId: parseInt(taskId),
      fields: { [fieldName]: targetValue },
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
        return;
      }

      if (response.ok) {
        const updated = await response.json();
        setTask(updated);
        setEditingValues(updated);
        showToast(`Task ${fieldName} updated to ${targetValue}!`, "success");
      } else {
        showToast(`Failed to update ${fieldName}`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast(`Failed to update ${fieldName}`, "error");
    } finally {
      setSavingField(null);
    }
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

  if (loading) return <div className="p-8 text-slate-400 text-left bg-slate-900 min-h-screen">Loading task context...</div>;
  if (!task) return <div className="p-8 text-red-400 text-left bg-slate-900 min-h-screen">Task details unavailable.</div>;

  const currentTaskType = (task.taskType || 'TASK').toUpperCase();

  return (
    <div className="min-h-screen w-full bg-slate-900 font-sans text-sm text-slate-100 text-left mb-12 relative">
      
      {/* Interactive Breadcrumb Bar */}
      <div className="px-8 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
        <div className="flex items-center gap-2 text-slate-400 font-medium text-xs flex-wrap">
          <button onClick={() => navigate('/projects')} className="hover:text-blue-400 hover:underline transition-colors cursor-pointer">
            Projects
          </button>
          
          <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
          
          <button onClick={() => navigate(-1)} className="hover:text-blue-400 hover:underline transition-colors cursor-pointer">
            Core Engine
          </button>
          
          {task.parentTask && (
            <>
              <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
              <button 
                onClick={() => navigate(`/tasks/details?taskId=${task.parentTask.id}`)} 
                className="font-mono font-bold text-blue-400 hover:underline cursor-pointer flex items-center gap-1.5"
                title={task.parentTask.title}
              >
                <span>TASK-{task.parentTask.id}</span>
                <span className={`px-1 rounded text-[8px] font-bold uppercase border scale-90 ${COMPACT_TYPE_STYLES[task.parentTask.taskType?.toUpperCase()] || COMPACT_TYPE_STYLES.DEFAULT}`}>
                  {task.parentTask.taskType?.toLowerCase()}
                </span>
              </button>
            </>
          )}

          <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
          <span className="text-slate-100 font-semibold">TASK-{taskId}</span>
          
          <span className={`ml-2 px-2 py-0.5 text-[10px] rounded border font-bold uppercase tracking-wider flex items-center ${TYPE_STYLES[currentTaskType] || TYPE_STYLES.DEFAULT}`}>
            {TYPE_ICONS[currentTaskType] || TYPE_ICONS.DEFAULT}
            {task.taskType || 'TASK'}
          </span>
        </div>

        {/* Profile Avatar Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 border-l border-slate-700 pl-4 h-7 relative" ref={userDropdownRef}>
            <span className="font-semibold text-slate-200 text-xs truncate max-w-[120px] capitalize">
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
                  className="h-full w-full rounded-full object-cover border border-slate-700 shadow-xs transition-all duration-200 ease-in-out group-hover/avatar:scale-130 group-hover/avatar:shadow-md z-10 relative"
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
              <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-1 ring-slate-800 z-20 transition-all group-hover/avatar:translate-x-0.5 group-hover/avatar:translate-y-0.5" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 top-9 w-64 bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="h-14 w-14 rounded-full overflow-hidden border border-slate-700 shadow-xs bg-slate-900">
                    {avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined' && avatarUrl.trim() !== '' ? (
                      <img src={avatarUrl} alt={displayUserName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-full w-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center uppercase">
                        {displayUserName.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-0.5 w-full">
                    <h4 className="text-sm font-bold text-slate-100 capitalize truncate">
                      {displayUserName}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-400 truncate">
                      {parsedUserData?.email || 'No email attached'}
                    </p>
                  </div>

                  <div className="w-full border-t border-slate-700 pt-2.5 mt-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-950/50 text-green-300 text-[10px] font-bold border border-green-800 uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Authorized Session
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex max-w-7xl mx-auto px-8 py-6 gap-8">
        <div className="flex-1 min-w-0 space-y-6">
          
          {/* Summary Title Block */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Summary / Title</label>
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
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700 opacity-70' 
                    : 'bg-transparent border-transparent hover:border-slate-700 focus:border-blue-400 text-slate-100 focus:bg-slate-800'
                }`}
              />
              {editingValues.title !== task.title && !lockedFields.title && (
                <div className="flex gap-1 pt-1">
                  <button onClick={() => commitFieldUpdate('title')} className="p-1 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"><Check size={16} /></button>
                  <button onClick={() => cancelFieldUpdate('title')} className="p-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 cursor-pointer"><X size={16} /></button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-slate-100 font-semibold">Description</h3>
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
                    className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium cursor-pointer"
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
                  const selection = window.getSelection();
                  if (selection && selection.toString().length > 0) {
                    return;
                  }
                  if (!lockedFields.description) {
                    setIsEditingDescription(true);
                    broadcastLock('description', true);
                  }
                }}
                className={`w-full overflow-hidden break-words border rounded p-4 text-slate-300 leading-relaxed min-h-[100px] transition-all markdown-container ${
                  lockedFields.description 
                    ? 'bg-slate-800/80 cursor-not-allowed border-slate-700 opacity-60' 
                    : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 cursor-text'
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
                  <span className="italic text-slate-500">Add a description...</span>
                )}
              </div>
            )}
          </div>

          {/* Child Issues / Sub-Tasks */}
          <div className="border-t border-slate-800 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-100 font-semibold flex items-center gap-2">
                <span>Child Issues / Sub-Tasks</span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                  {task.subIssues ? task.subIssues.length : 0}
                </span>
              </h3>

              <button
                type="button"
                onClick={() => setShowSubTaskInput(prev => !prev)}
                className="p-1.5 rounded bg-slate-800 hover:bg-blue-950/40 text-slate-300 hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold px-2.5 border border-slate-700"
                title="Create Sub-Task"
              >
                <Plus size={14} />
                <span>Create Sub-Task</span>
              </button>
            </div>

            {showSubTaskInput && (
              <form onSubmit={handleCreateSubTask} className="mb-3 flex items-center gap-2 animate-in fade-in duration-150 bg-slate-800/60 p-2 rounded-lg border border-slate-700">
                <input
                  type="text"
                  placeholder="What needs to be done? Enter sub-task title..."
                  value={subTaskTitle}
                  onChange={(e) => setSubTaskTitle(e.target.value)}
                  autoFocus
                  className="flex-1 border border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded px-3 py-1.5 text-xs text-slate-100 outline-none bg-slate-900 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!subTaskTitle.trim() || creatingSubTask}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 text-white font-medium rounded text-xs transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0"
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
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </form>
            )}

            {task.subIssues && task.subIssues.length > 0 ? (
              <div className="border border-slate-800 rounded-lg divide-y divide-slate-800 overflow-hidden bg-slate-900 shadow-xs">
                {task.subIssues.map((child) => (
                  <div 
                    key={child.id}
                    onClick={(e) => {
                      const selection = window.getSelection();
                      if (selection && selection.toString().length > 0) {
                        return;
                      }
                      navigate(`/tasks/details?taskId=${child.id}`);
                    }}
                    className="flex items-center justify-between p-2.5 hover:bg-slate-800/80 cursor-pointer transition-colors text-xs group/item gap-3"
                  >
                    {/* Left: ID + Type Badge + Title */}
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      <span className="font-mono font-bold text-blue-400 group-hover/item:underline shrink-0 text-xs">
                        TASK-{child.id}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border shrink-0 ${COMPACT_TYPE_STYLES[child.taskType?.toUpperCase()] || COMPACT_TYPE_STYLES.DEFAULT}`}>
                        {child.taskType || 'SUB_TASK'}
                      </span>
                      <span className="text-slate-200 font-medium truncate shrink min-w-0 text-xs" title={child.title}>
                        {child.title || `Sub-Task ${child.id}`}
                      </span>
                    </div>
                    
                    {/* Right: Priority Dropdown + Status Dropdown */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-22 flex justify-end">
                        {syncingSubTaskId === child.id ? (
                          <span className="text-[9px] text-slate-400 animate-pulse">Saving...</span>
                        ) : (() => {
                          const rawPriority = child.priority || child.taskPriority;
                          const prioKey = rawPriority ? String(rawPriority).toUpperCase() : 'MEDIUM';
                          const prioConfig = PRIORITY_CONFIG[prioKey] || PRIORITY_CONFIG.MEDIUM || PRIORITY_CONFIG.DEFAULT;

                          return (
                            <button
                              type="button"
                              onClick={(e) => triggerInlineMenuContainer(e, child.id, 'priority')}
                              className={`w-full inline-flex items-center justify-between px-1.5 py-0.5 rounded border text-[9px] uppercase shadow-2xs cursor-pointer transition-all ${prioConfig.style}`}
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                {prioConfig.icon}
                                <span className="truncate">{prioConfig.label}</span>
                              </div>
                              <ChevronDown size={9} className="opacity-60 shrink-0 ml-0.5" />
                            </button>
                          );
                        })()}
                      </div>

                      <div className="w-22 flex justify-end">
                        {syncingSubTaskId === child.id ? (
                          <span className="text-[9px] text-slate-400 animate-pulse">Saving...</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => triggerInlineMenuContainer(e, child.id, 'status')}
                            className={`w-full inline-flex items-center justify-between px-1.5 py-0.5 rounded border text-[8.5px] font-bold tracking-wide uppercase shadow-2xs cursor-pointer transition-all ${STATUS_STYLES[child.taskStatus?.toUpperCase()] || STATUS_STYLES.DEFAULT}`}
                          >
                            <span className="truncate">{(child.taskStatus || 'TO_DO').replace('_', ' ')}</span>
                            <ChevronDown size={9} className="opacity-60 shrink-0 ml-0.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 text-xs italic py-2 pl-1">
                No active sub-issues linked.
              </div>
            )}
          </div>

          {/* Activity / Comments */}
          <div className="border-t border-slate-800 pt-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-100 font-semibold mb-2">
              <MessageSquare size={16} className="text-slate-400" />
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
                    <div key={comment.id} className="flex gap-3 bg-slate-800/60 p-3 rounded-lg border border-slate-800 relative group/comment">
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
                          <span className="font-semibold text-slate-200">{commentAuthorName}</span>
                          <span className="text-slate-500 font-normal">Just now</span>
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
                                className="px-2.5 py-1 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded font-medium transition-colors cursor-pointer"
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
                            onClick={() => {
                              const selection = window.getSelection();
                              if (selection && selection.toString().length > 0) {
                                return;
                              }
                              startEditingComment(comment);
                            }}
                            title="Click to edit comment"
                            className="text-xs text-slate-300 leading-relaxed markdown-container w-full overflow-hidden break-words cursor-pointer hover:bg-slate-800 p-1.5 rounded-md transition-colors"
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
                        className="absolute right-3 top-3 text-slate-600 hover:text-red-500 opacity-0 group-hover/comment:opacity-100 p-1 transition-all cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 text-xs italic py-4">No comments posted yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-80 border border-slate-800 rounded-lg p-4 bg-slate-800/60 space-y-4 shadow-sm h-fit relative">
          
          {/* TOP ACTION ROW: Interactive Custom Dropdowns with Hollow Chevron */}
          <div className="flex items-end justify-between gap-3 border-b border-slate-700/60 pb-3.5">
            
            {/* Status Control */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
              <button
                type="button"
                disabled={!!lockedFields.taskStatus}
                onClick={(e) => triggerInlineMenuContainer(e, taskId, 'parentStatus')}
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide transition-all cursor-pointer select-none bg-transparent hover:opacity-80 py-0.5 ${
                  (editingValues.taskStatus || task.taskStatus) === 'DONE' ? 'text-green-400' :
                  (editingValues.taskStatus || task.taskStatus) === 'IN_PROGRESS' ? 'text-blue-400' :
                  (editingValues.taskStatus || task.taskStatus) === 'BLOCKED' ? 'text-red-400' : 'text-slate-300'
                }`}
              >
                <span>{((editingValues.taskStatus || task.taskStatus || 'TO_DO')).replace('_', ' ')}</span>
                <ChevronDown size={11} className="text-slate-500 opacity-70" />
              </button>
            </div>

            {/* Priority Control */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Priority</span>
              {(() => {
                const prioKey = (editingValues.priority || task.priority || 'MEDIUM').toUpperCase();
                const prioConfig = PRIORITY_CONFIG[prioKey] || PRIORITY_CONFIG.MEDIUM || PRIORITY_CONFIG.DEFAULT;

                return (
                  <button
                    type="button"
                    disabled={!!lockedFields.priority}
                    onClick={(e) => triggerInlineMenuContainer(e, taskId, 'parentPriority')}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase transition-all cursor-pointer select-none bg-transparent hover:opacity-80 py-0.5 ${
                      prioKey === 'CRITICAL' || prioKey === 'HIGHEST' ? 'text-red-400' :
                      prioKey === 'HIGH' ? 'text-orange-400' :
                      prioKey === 'LOW' ? 'text-blue-400' : 'text-amber-400'
                    }`}
                  >
                    <span>{prioConfig.label}</span>
                    <ChevronDown size={11} className="text-slate-500 opacity-70" />
                  </button>
                );
              })()}
            </div>

            {/* Type Control */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Type</span>
              {(() => {
                const currentType = (editingValues.taskType || task.taskType || 'TASK').toUpperCase();

                return (
                  <button
                    type="button"
                    disabled={!!lockedFields.taskType}
                    onClick={(e) => triggerInlineMenuContainer(e, taskId, 'parentType')}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase transition-all cursor-pointer select-none bg-transparent hover:opacity-80 py-0.5 ${
                      currentType === 'BUG' ? 'text-red-400' :
                      currentType === 'STORY' ? 'text-green-400' :
                      currentType === 'EPIC' ? 'text-purple-400' :
                      currentType === 'SUB_TASK' ? 'text-teal-400' : 'text-blue-400'
                    }`}
                  >
                    <span>{currentType.replace('_', ' ')}</span>
                    <ChevronDown size={11} className="text-slate-500 opacity-70" />
                  </button>
                );
              })()}
            </div>

            {/* Delete Button */}
            <div className="flex flex-col gap-1 items-end">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider opacity-0 select-none">.</span>
              <button 
                onClick={() => setShowDeleteModal(true)} 
                className="flex items-center justify-center p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-500 transition-colors cursor-pointer shadow-xs"
                title="Delete Issue"
              >
                <Trash2 size={13} className="text-white" />
              </button>
            </div>
          </div>

          {savingField && <div className="text-[10px] text-blue-400 animate-pulse text-right">saving {savingField}...</div>}

          {/* SEQUENCE 1: ASSIGNEE */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assignee</label>
              <LockBadge lockInfo={lockedFields.assignee} fieldName="assignee" />
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex-1 flex items-center gap-2 rounded p-1.5 transition-all border ${
                lockedFields.assignee 
                  ? 'bg-slate-800 border-slate-700 cursor-not-allowed' 
                  : 'bg-transparent border-transparent hover:border-slate-700 focus-within:border-blue-500 focus-within:bg-slate-900'
              }`}>
                <UserAvatar 
                  rawString={editingValues.assignee} 
                  fallbackAvatarUrl={editingValues.assignee?.split('|')[0] === displayUserName ? avatarUrl : null} 
                  size="w-5 h-5" 
                />
                <input
                  type="text"
                  disabled={!!lockedFields.assignee}
                  onFocus={() => broadcastLock('assignee', true)}
                  onBlur={() => broadcastLock('assignee', false)}
                  value={editingValues.assignee ? editingValues.assignee.split('|')[0] : ''}
                  placeholder="Unassigned"
                  onChange={(e) => handleInputChange('assignee', e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-slate-200 placeholder-slate-600"
                />
              </div>
              {editingValues.assignee !== task.assignee && !lockedFields.assignee && (
                <button onClick={() => commitFieldUpdate('assignee')} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"><Check size={13} /></button>
              )}
            </div>
          </div>

          {/* SEQUENCE 2: REPORTER */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reporter</label>
              <LockBadge lockInfo={lockedFields.reporter} fieldName="reporter" />
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex-1 flex items-center gap-2 rounded p-1.5 transition-all border ${
                lockedFields.reporter 
                  ? 'bg-slate-800 border-slate-700 cursor-not-allowed' 
                  : 'bg-transparent border-transparent hover:border-slate-700 focus-within:border-blue-500 focus-within:bg-slate-900'
              }`}>
                <UserAvatar 
                  rawString={editingValues.reporter} 
                  fallbackAvatarUrl={editingValues.reporter?.split('|')[0] === displayUserName ? avatarUrl : null} 
                  size="w-5 h-5" 
                />
                <input
                  type="text"
                  disabled={!!lockedFields.reporter}
                  onFocus={() => broadcastLock('reporter', true)}
                  onBlur={() => broadcastLock('reporter', false)}
                  value={editingValues.reporter ? editingValues.reporter.split('|')[0] : ''}
                  placeholder="System"
                  onChange={(e) => handleInputChange('reporter', e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-slate-200 placeholder-slate-600"
                />
              </div>
              {editingValues.reporter !== task.reporter && !lockedFields.reporter && (
                <button onClick={() => commitFieldUpdate('reporter')} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"><Check size={13} /></button>
              )}
            </div>
          </div>

          {/* SEQUENCE 3: CREATED DATE */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created Date</label>
            </div>
            <div className="px-1.5 py-1 text-xs text-slate-300 font-medium">
              {task.createdAt || task.createdDate ? (() => {
                const raw = task.createdAt || task.createdDate;
                try {
                  const d = new Date(raw);
                  if (!isNaN(d.getTime())) {
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    return `${day}-${month}-${year}`;
                  }
                } catch (e) {}
                const datePart = raw.split('T')[0];
                const [y, m, d] = datePart.split('-');
                return d && m && y ? `${d}-${m}-${y}` : raw;
              })() : "Just now"}
            </div>
          </div>

          <hr className="border-slate-700/60" />

          {/* SEQUENCE 4: LINK ISSUE */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-left">
              Link Issue / Hierarchy
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
                  className="flex-1 border border-transparent hover:border-slate-700 focus:border-blue-500 rounded p-1.5 outline-none text-slate-200 font-medium text-xs bg-transparent focus:bg-slate-900 transition-all placeholder-slate-600"
                />
                <button
                  type="submit"
                  disabled={!linkingTaskId || isLinking}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded text-xs transition-all cursor-pointer shadow-xs whitespace-nowrap"
                >
                  {isLinking ? '...' : 'Link'}
                </button>
              </div>
            </form>
          </div>

          <hr className="border-slate-700/60" />

          {/* SEQUENCE 5: DEVELOPMENT / GITHUB PULL REQUESTS */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <GitPullRequest size={13} className="text-slate-400" />
                <span>Development</span>
              </label>
              <div className="flex items-center gap-1.5">
                {loadingPrs && <span className="text-[10px] text-blue-400 animate-pulse">fetching...</span>}
                <button
                  type="button"
                  onClick={fetchGithubPRs}
                  disabled={loadingPrs}
                  className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                  title="Refresh Pull Requests"
                >
                  <RefreshCw size={12} className={loadingPrs ? 'animate-spin text-blue-400' : ''} />
                </button>
              </div>
            </div>

            {pullRequests && pullRequests.length > 0 ? (
              <div className="space-y-3">
                {/* 1. Core / Backend Section */}
                {(() => {
                  const corePrs = pullRequests.filter(pr => (pr.title || '').toLowerCase().includes('jira-core') || !(pr.title || '').toLowerCase().includes('jira-ui'));
                  if (corePrs.length === 0) return null;
                  return (
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Core (Jira-Core)</span>
                      {corePrs.map(pr => {
                        const isMerged = pr.isMerged;
                        const isOpen = pr.state === 'open';
                        return (
                          <a key={pr.id} href={pr.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 rounded-lg border border-slate-700 hover:border-blue-500 bg-slate-900/40 hover:bg-slate-900 transition-all text-xs group cursor-pointer shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0 pr-1">
                              <GitPullRequest size={14} className={isMerged ? 'text-purple-400 flex-shrink-0' : isOpen ? 'text-green-400 flex-shrink-0' : 'text-red-500 flex-shrink-0'} />
                              <div className="truncate">
                                <p className="font-bold text-slate-200 group-hover:text-blue-400 truncate text-[11px]">#{pr.number}: {pr.title}</p>
                              </div>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border flex-shrink-0 ${isMerged ? 'bg-purple-950/50 text-purple-300 border-purple-800' : isOpen ? 'bg-green-950/50 text-green-300 border-green-800' : 'bg-red-950/50 text-red-300 border-red-800'}`}>
                              {isMerged ? 'MERGED' : isOpen ? 'OPEN' : 'CLOSED'}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* 2. UI Section */}
                {(() => {
                  const uiPrs = pullRequests.filter(pr => (pr.title || '').toLowerCase().includes('jira-ui'));
                  if (uiPrs.length === 0) return null;
                  return (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">UI (Jira-Ui)</span>
                      {uiPrs.map(pr => {
                        const isMerged = pr.isMerged;
                        const isOpen = pr.state === 'open';
                        return (
                          <a key={pr.id} href={pr.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 rounded-lg border border-slate-700 hover:border-blue-500 bg-slate-900/40 hover:bg-slate-900 transition-all text-xs group cursor-pointer shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0 pr-1">
                              <GitPullRequest size={14} className={isMerged ? 'text-purple-400 flex-shrink-0' : isOpen ? 'text-green-400 flex-shrink-0' : 'text-red-500 flex-shrink-0'} />
                              <div className="truncate">
                                <p className="font-bold text-slate-200 group-hover:text-blue-400 truncate text-[11px]">#{pr.number}: {pr.title}</p>
                              </div>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border flex-shrink-0 ${isMerged ? 'bg-purple-950/50 text-purple-300 border-purple-800' : isOpen ? 'bg-green-950/50 text-green-300 border-green-800' : 'bg-red-950/50 text-red-300 border-red-800'}`}>
                              {isMerged ? 'MERGED' : isOpen ? 'OPEN' : 'CLOSED'}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic bg-slate-900/30 p-2 rounded border border-slate-700/50">
                {loadingPrs ? 'Querying GitHub API...' : `No PRs linked for TASK-${taskId}`}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Popover Dropdown Menu */}
      {activeInlineMenu && (
        <div 
          ref={inlineMenuRef}
          onClick={(e) => e.stopPropagation()}
          className="fixed bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-1.5 z-50 min-w-[140px] max-w-xs max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`
          }}
        >
          <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-700 mb-0.5 tracking-wider sticky top-0 bg-slate-800">
            Select {activeInlineMenu.fieldType.replace('parent', '')}
          </div>

          {/* Status Options */}
          {(activeInlineMenu.fieldType === 'status' || activeInlineMenu.fieldType === 'parentStatus') && 
            (metadata.statuses || ['TO_DO', 'IN_PROGRESS', 'DONE']).map(opt => (
              <button
                key={opt}
                onClick={() => {
                  if (activeInlineMenu.fieldType === 'parentStatus') {
                    executeParentTaskMutation('taskStatus', opt);
                  } else {
                    executeInlineSubTaskMutation(activeInlineMenu.targetId, 'status', opt);
                  }
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span className={`w-2 h-2 rounded-full ${
                  opt === 'DONE' ? 'bg-green-500' : opt === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-400'
                }`} />
                <span>{opt.replace('_', ' ')}</span>
              </button>
            ))
          }

          {/* Priority Options */}
          {(activeInlineMenu.fieldType === 'priority' || activeInlineMenu.fieldType === 'parentPriority') && 
            (metadata.priorities || ['LOW', 'MEDIUM', 'HIGH', 'HIGHEST', 'CRITICAL']).map(opt => {
              const config = PRIORITY_CONFIG[opt.toUpperCase()] || PRIORITY_CONFIG.DEFAULT;
              return (
                <button
                  key={opt}
                  onClick={() => {
                    if (activeInlineMenu.fieldType === 'parentPriority') {
                      executeParentTaskMutation('priority', opt);
                    } else {
                      executeInlineSubTaskMutation(activeInlineMenu.targetId, 'priority', opt);
                    }
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <span className="capitalize">{config.label}</span>
                  </div>
                </button>
              );
            })
          }

          {/* Type Options (Parent) */}
          {activeInlineMenu.fieldType === 'parentType' && 
            (metadata.taskTypes || ['STORY', 'BUG', 'TASK', 'EPIC', 'SUB_TASK']).map(opt => (
              <button
                key={opt}
                onClick={() => executeParentTaskMutation('taskType', opt)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase border ${COMPACT_TYPE_STYLES[opt] || COMPACT_TYPE_STYLES.DEFAULT}`}>
                  {opt}
                </span>
                <span>{opt.replace('_', ' ')}</span>
              </button>
            ))
          }
        </div>
      )}

      {/* Modal Confirmation Window */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 w-full max-w-md p-6 text-left transform scale-100 transition-all space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-950/50 rounded-full text-red-400 flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-100">Delete Issue TASK-{taskId}?</h3>
                <p className="text-xs text-slate-400 leading-normal">
                  Are you absolutely sure you want to drop this issue blueprint from the project tracking catalog? This action is permanent and cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button 
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors rounded-lg cursor-pointer"
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

      {/* Floating Toast Window */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-xs font-medium tracking-wide ${
            toastType === 'success' 
              ? 'bg-green-950/80 text-green-200 border-green-800' 
              : 'bg-red-950/80 text-red-200 border-red-800'
          }`}>
            {toastType === 'success' ? (
              <Check size={16} className="text-green-400 flex-shrink-0" />
            ) : (
              <X size={16} className="text-red-400 flex-shrink-0" />
            )}
            <span>{toastMessage}</span>
            <button 
              type="button" 
              onClick={() => setToastMessage(null)} 
              className="ml-2 text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}