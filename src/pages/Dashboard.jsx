import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { 
  Plus, 
  X, 
  LayoutGrid, 
  Sliders, 
  Layers, 
  Trash2, 
  Bookmark, 
  Bug, 
  CheckSquare, 
  Zap, 
  ChevronLeft, 
  ChevronRight, 
  ListTodo, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  LogOut, 
  RefreshCw, 
  FolderSync, 
  ChevronDown, 
  User, 
  Columns, 
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Search
} from 'lucide-react'; 

const DEFAULT_WIDGETS = [
  { id: 'w-todo', title: 'To Do Lane', type: 'STATUS', value: 'TO_DO', page: 0, hasMore: true, items: [] },
  { id: 'w-inprogress', title: 'In Progress Lane', type: 'STATUS', value: 'IN_PROGRESS', page: 0, hasMore: true, items: [] }
];

const AVAILABLE_OPTIONAL_COLUMNS = [
  { key: 'taskType', label: 'Type' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'reporter', label: 'Reporter' }
];

const STATUS_STYLES = {
  TO_DO: 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 font-semibold',
  IN_PROGRESS: 'bg-blue-950/50 text-blue-300 border-blue-800 font-semibold',
  IN_REVIEW: 'bg-purple-950/50 text-purple-300 border-purple-800 font-semibold',
  TESTING: 'bg-indigo-950/50 text-indigo-300 border-indigo-800 font-semibold',
  DONE: 'bg-green-950/50 text-green-300 border-green-800 font-semibold',
  BLOCKED: 'bg-red-950/50 text-red-300 border-red-800 font-semibold',
  DEFAULT: 'bg-slate-800 text-slate-400 border-slate-700'
};

const PRIORITY_STYLES = {
  LOW: 'bg-sky-950/50 text-sky-300 border-sky-800 font-semibold hover:bg-sky-900/50',
  MEDIUM: 'bg-blue-950/50 text-blue-300 border-blue-800 font-semibold hover:bg-blue-900/50',
  HIGH: 'bg-orange-950/50 text-orange-300 border-orange-800 font-bold hover:bg-orange-900/50',
  CRITICAL: 'bg-red-900/60 text-red-200 border-red-700 font-extrabold animate-pulse hover:bg-red-900',
  DEFAULT: 'bg-slate-800 text-slate-400 border-slate-700'
};

const TYPE_STYLES = {
  STORY: 'bg-green-600 text-white border-transparent',
  BUG: 'bg-red-600 text-white border-transparent',
  TASK: 'bg-blue-500 text-white border-transparent',
  EPIC: 'bg-purple-600 text-white border-transparent',
  DEFAULT: 'bg-slate-500 text-white border-transparent'
};

const COMPACT_TYPE_STYLES = {
  STORY: 'bg-green-950/40 text-green-300 border-green-800 hover:bg-green-900/40',
  BUG: 'bg-red-950/40 text-red-300 border-red-800 hover:bg-red-900/40',
  TASK: 'bg-blue-950/40 text-blue-300 border-blue-800 hover:bg-blue-900/40',
  EPIC: 'bg-purple-950/40 text-purple-300 border-purple-800 hover:bg-purple-900/40',
  DEFAULT: 'bg-slate-800 text-slate-300 border-slate-700'
};

const TABLE_TYPE_ICONS = {
  STORY: <Bookmark size={12} className="fill-current text-green-400" />,
  BUG: <Bug size={12} className="text-red-400" />,
  TASK: <CheckSquare size={12} className="text-blue-400" />,
  EPIC: <Zap size={12} className="fill-current text-purple-400" />
};

const UserAvatar = ({ rawString, fallbackAvatarUrl, size = "w-5 h-5" }) => {
  const [imgError, setImgError] = useState(false);

  if (!rawString || rawString.trim() === '' || rawString.toLowerCase() === 'unassigned') {
    return (
      <div className="flex items-center gap-1.5 text-slate-500 italic text-[11px]">
        <div className={`${size} rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-400`}>
          <User size={10} />
        </div>
        <span>Unassigned</span>
      </div>
    );
  }

  if (rawString.toLowerCase() === 'system') {
    return (
      <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px]">
        <div className={`${size} rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[9px] flex-shrink-0 border border-slate-700`}>
          S
        </div>
        <span>System</span>
      </div>
    );
  }

  const parts = rawString.split('|');
  const cleanName = parts[0] ? parts[0].trim() : '';
  const parsedAvatarUrl = parts[1] && parts[1].trim() !== '' && parts[1] !== 'null' && parts[1] !== 'undefined'
    ? parts[1].trim() 
    : fallbackAvatarUrl;

  const initial = cleanName ? cleanName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="flex items-center gap-2 min-w-0" title={cleanName}>
      {parsedAvatarUrl && !imgError ? (
        <img 
          src={parsedAvatarUrl} 
          alt={cleanName} 
          className={`${size} rounded-full object-cover border border-slate-700 shadow-2xs flex-shrink-0`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <div 
          className={`${size} rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[9px] uppercase shadow-2xs flex-shrink-0 border border-blue-700`}
        >
          {initial}
        </div>
      )}
      <span className="truncate font-medium text-slate-200 capitalize text-[11px]">{cleanName}</span>
    </div>
  );
};

export default function JiraDashboard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [taskToDelete, setTaskToDelete] = useState(null);
  
  // Default to collapsed mode
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  
  const [activeInlineMenu, setActiveInlineMenu] = useState(null); 
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [syncingTaskId, setSyncingTaskId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Global search state for fetching task by ID with live suggestions
  const [globalSearchId, setGlobalSearchId] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState(null);
  const [searchingGlobal, setSearchingGlobal] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);
  
  const dashboardUserRef = useRef(null);
  const inlineMenuRef = useRef(null);
  const columnMenuRef = useRef(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // User selectable optional columns
  const [visibleOptionalCols, setVisibleOptionalCols] = useState(() => {
    const saved = localStorage.getItem('jira_table_visible_columns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return []; 
  });

  const toggleOptionalColumn = (colKey) => {
    setVisibleOptionalCols(prev => {
      const next = prev.includes(colKey) ? prev.filter(k => k !== colKey) : [...prev, colKey];
      localStorage.setItem('jira_table_visible_columns', JSON.stringify(next));
      return next;
    });
  };

  const isColVisible = (colKey) => visibleOptionalCols.includes(colKey);

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

  const [allTasks, setAllTasks] = useState([]);
  const [allTasksPage, setAllTasksPage] = useState(0);
  const [allTasksSize] = useState(20);
  const [loadingTable, setLoadingTable] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [activeWidgets, setActiveWidgets] = useState(() => {
    const savedLayout = localStorage.getItem('jira_dashboard_layout');
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout);
        return parsed.map(w => ({ ...w, page: 0, hasMore: true, items: [] }));
      } catch (e) {
        console.error("Failed to parse saved layout", e);
      }
    }
    return DEFAULT_WIDGETS;
  });

  const [metadata, setMetadata] = useState({
    statuses: ['TO_DO', 'IN_PROGRESS', 'DONE'],
    priorities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    taskTypes: ['STORY', 'BUG', 'TASK', 'EPIC']
  });

  const [formData, setFormData] = useState({
    title: '', description: '', taskType: 'STORY', assignee: '',
    taskStatus: 'TO_DO', priority: 'MEDIUM', reporter: ''
  });

  const PAGE_SIZE = 10;

  const persistWidgetLayout = (widgets) => {
    const layoutBlueprint = widgets.map(w => ({ id: w.id, title: w.title, type: w.type, value: w.value }));
    localStorage.setItem('jira_dashboard_layout', JSON.stringify(layoutBlueprint));
  };

  const fetchWidgetData = async (widget, pageNum = 0, append = false) => {
    try {
      let apiUrl = '';
      if (widget.type === 'STATUS') {
        apiUrl = `${API_BASE_URL}/api/tasks/by-status/${projectId}?status=${widget.value}&page=${pageNum}&size=${PAGE_SIZE}`;
      } else if (widget.type === 'PRIORITY') {
        apiUrl = `${API_BASE_URL}/api/tasks/by-priority/${projectId}?priority=${widget.value}&page=${pageNum}&size=${PAGE_SIZE}`;
      } else if (widget.type === 'TYPE') {
        apiUrl = `${API_BASE_URL}/api/tasks/by-task-type/${projectId}?type=${widget.value}&page=${pageNum}&size=${PAGE_SIZE}`;
      }

      const response = await fetch(apiUrl, { headers: getAuthHeaders() });
      
      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setActiveWidgets(prev => prev.map(w => {
          if (w.id === widget.id) {
            return {
              ...w,
              items: append ? [...w.items, ...data] : data,
              page: pageNum + 1,
              hasMore: data.length === PAGE_SIZE
            };
          }
          return w;
        }));
      }
    } catch (error) {
      console.error(`Error populating widget data for type ${widget.type}:`, error);
    }
  };

  const fetchAllTasksTableData = async () => {
    setLoadingTable(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/project/${projectId}?page=${allTasksPage}&size=${allTasksSize}`, {
        headers: getAuthHeaders() 
      });
      
      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.status === 204) {
        setAllTasks([]);
      } else if (response.ok) {
        const data = await response.json();
        setAllTasks(data);
      }
    } catch (error) {
      console.error("Error loading table data pipeline:", error);
    } finally {
      setLoadingTable(false);
    }
  };

  // Live AJAX lookup for task ID suggestions as user types
  const handleGlobalSearchChange = (e) => {
    const val = e.target.value;
    setGlobalSearchId(val);

    const cleanId = val.replace(/[^0-9]/g, '');
    if (!cleanId) {
      setSearchSuggestions(null);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/get/created-task?taskId=${cleanId}`, {
          headers: getAuthHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          const taskObj = data.tasks || data;
          setSearchSuggestions({ id: cleanId, title: taskObj.title });
        } else {
          setSearchSuggestions(null);
        }
      } catch (err) {
        setSearchSuggestions(null);
      }
    }, 300);
  };

  // Global search by Task ID using query parameter endpoint
  const handleGlobalSearchSubmit = async (e) => {
    e.preventDefault();
    if (!globalSearchId.trim()) return;

    const cleanId = globalSearchId.replace(/[^0-9]/g, '');
    if (!cleanId) {
      alert("Please enter a valid numeric Task ID.");
      return;
    }

    setSearchingGlobal(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/get/created-task?taskId=${cleanId}`, {
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        setSearchSuggestions(null);
        navigate(`/tasks/details?taskId=${cleanId}`);
      } else if (response.status === 404) {
        alert(`Task ID ${cleanId} was not found.`);
      } else {
        alert("Failed to fetch task details.");
      }
    } catch (error) {
      console.error("Error performing global search:", error);
      alert("An error occurred while searching for the task.");
    } finally {
      setSearchingGlobal(false);
    }
  };

  const executeInlineFieldMutation = async (taskId, fieldFieldName, targetValue) => {
    setSyncingTaskId(taskId);
    setActiveInlineMenu(null); 
    
    const payloadKey = fieldFieldName === 'type' ? 'taskType' : fieldFieldName === 'status' ? 'taskStatus' : 'priority';

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/update/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ [payloadKey]: targetValue })
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, [payloadKey]: targetValue } : t));
        activeWidgets.forEach(widget => fetchWidgetData(widget, 0, false));
      } else {
        alert("Server rejected processing inline payload changes.");
      }
    } catch (error) {
      console.error("Pipeline exception caught inside field update thread:", error);
    } finally {
      setSyncingTaskId(null);
    }
  };
  
  const handleDeleteWidgetTask = async () => {
    if (!taskToDelete) return;
    const { taskId, widgetId } = taskToDelete;

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
        if (widgetId) {
          setActiveWidgets(prev => prev.map(w => {
            if (w.id === widgetId) {
              return { ...w, items: w.items.filter(item => item.id !== taskId) };
            }
            return w;
          }));
        } else {
          setActiveWidgets(prev => prev.map(w => ({
            ...w,
            items: w.items.filter(item => item.id !== taskId)
          })));
        }

        setAllTasks(prev => prev.filter(task => task.id !== taskId));
      } else {
        alert("Failed to delete task.");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setTaskToDelete(null);
    }
  };

  useEffect(() => {
    async function initDashboard() {
      try {
        const configRes = await fetch(`${API_BASE_URL}/api/tasks/config`, {
          headers: getAuthHeaders()
        });
        if (configRes.status === 401) {
          handleLogout();
          return;
        }
        if (configRes.ok) {
          const configData = await configRes.json();
          setMetadata(configData);
        }
      } catch (e) {
        console.error("Failed to load workspace configuration metadata:", e);
      }

      try {
        await Promise.all(
          activeWidgets.map(widget => fetchWidgetData(widget, 0, false))
        );
      } catch (e) {
        console.error("Error populating workspace monitor lanes:", e);
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      initDashboard();
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchAllTasksTableData();
    }
  }, [allTasksPage, allTasksSize, projectId]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dashboardUserRef.current && !dashboardUserRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setShowColumnDropdown(false);
      }
      if (inlineMenuRef.current && !inlineMenuRef.current.contains(event.target)) {
        setActiveInlineMenu(null);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchSuggestions(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerInlineMenuContainer = (e, taskId, fieldType) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    
    setMenuPosition({
      top: rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - 180) 
    });
    
    setActiveInlineMenu(activeInlineMenu?.taskId === taskId && activeInlineMenu?.fieldType === fieldType 
      ? null 
      : { taskId, fieldType }
    );
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredTasks = useMemo(() => {
    if (!allTasks) return [];
    if (!searchQuery.trim()) return allTasks;

    const query = searchQuery.toLowerCase().trim();
    return allTasks.filter(task => {
      const idMatch = String(task.id).includes(query);
      const titleMatch = (task.title || '').toLowerCase().includes(query);
      const typeMatch = (task.taskType || '').toLowerCase().includes(query);
      const statusMatch = (task.taskStatus || '').toLowerCase().replace('_', ' ').includes(query);
      const priorityMatch = (task.priority || '').toLowerCase().includes(query);
      const assigneeMatch = (task.assignee || '').toLowerCase().includes(query);
      const reporterMatch = (task.reporter || '').toLowerCase().includes(query);

      return idMatch || titleMatch || typeMatch || statusMatch || priorityMatch || assigneeMatch || reporterMatch;
    });
  }, [allTasks, searchQuery]);

  const sortedTasks = useMemo(() => {
    let sortableTasks = [...filteredTasks];
    if (sortConfig.key !== null) {
      sortableTasks.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableTasks;
  }, [filteredTasks, sortConfig]);

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={12} className="text-slate-600 ml-1 inline-block" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={12} className="text-blue-400 font-bold ml-1 inline-block" /> 
      : <ArrowDown size={12} className="text-blue-400 font-bold ml-1 inline-block" />;
  };

  const handleAddCustomWidget = async (type, value) => {
    const cleanTitle = `${value.replace('_', ' ')} ${type.charAt(0) + type.slice(1).toLowerCase()}`;
    const newWidget = {
      id: `widget-${Date.now()}`, title: cleanTitle, type: type, value: value, page: 0, hasMore: true, items: []
    };

    setActiveWidgets(prev => {
      const nextLayout = [...prev, newWidget];
      persistWidgetLayout(nextLayout);
      return nextLayout;
    });

    setIsWidgetMenuOpen(false);
    await fetchWidgetData(newWidget, 0, false);
  };

  const handleRemoveWidget = (widgetId) => {
    setActiveWidgets(prev => {
      const nextLayout = prev.filter(w => w.id !== widgetId);
      persistWidgetLayout(nextLayout);
      return nextLayout;
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        projectId: parseInt(projectId) 
      };

      const response = await fetch(`${API_BASE_URL}/api/tasks/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload) 
      });
      
      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setIsCreateOpen(false);
        
        const trueTaskId = data.taskId || data.id; 
        if (trueTaskId) {
          navigate(`/tasks/details?taskId=${trueTaskId}`, { replace: true });
        } else {
          alert("Task created but missing identification payload reference.");
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const storedUserRaw = localStorage.getItem('jira_user');
  
  const parsedUserData = useMemo(() => {
    if (!storedUserRaw) return null;
    try {
      if (storedUserRaw.trim().startsWith('{')) {
        return JSON.parse(storedUserRaw);
      }
    } catch (e) {
      console.error("User payload formatting parse error", e);
    }
    return null;
  }, [storedUserRaw]);

  const displayUserName = useMemo(() => {
    if (parsedUserData) {
      return parsedUserData.username || parsedUserData.name || parsedUserData.email?.split('@')[0] || 'User';
    }
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

  return (
    <div className="flex h-screen w-screen bg-slate-900 font-sans text-slate-100 text-left overflow-hidden">
      {/* Sidebar Navigation */}
      <div 
        className={`bg-slate-800 border-r border-slate-700 flex flex-col p-4 shadow-sm relative shrink-0 transition-all duration-300 ease-in-out z-40 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        
        {/* Collapse / Expand Toggle Button (Hover triggers expansion) */}
        <div 
          onMouseEnter={() => setIsSidebarCollapsed(false)}
          onMouseLeave={() => setIsSidebarCollapsed(true)}
          className={`flex items-center mb-4 ${isSidebarCollapsed ? 'justify-center' : 'justify-end'}`}
        >
          <div
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            title={isSidebarCollapsed ? "Hover to expand sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </div>
        </div>

        <div 
          ref={dashboardUserRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowUserDropdown(!showUserDropdown);
          }} 
          className={`flex items-center gap-3 px-2 py-2.5 mb-4 border border-transparent hover:border-slate-700 hover:bg-slate-700/50 hover:shadow-xs rounded-xl cursor-pointer transition-all group/header relative select-none ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
          title="User Account Menu"
        >
          <div className="relative h-9 w-9 shrink-0">
            {avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined' && avatarUrl.trim() !== '' ? (
              <img 
                src={avatarUrl} 
                alt="User Profile" 
                className="h-full w-full rounded-full object-cover border border-slate-700 shadow-xs transition-all duration-200 ease-in-out group-hover/header:scale-115 group-hover/header:shadow-sm z-10 relative"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUserName)}&background=2563eb&color=fff`;
                }}
              />
            ) : (
              <div className="h-full w-full rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-inner uppercase transition-all duration-200 ease-in-out group-hover/header:scale-115 group-hover/header:shadow-sm z-10 relative">
                {displayUserName && displayUserName.trim() !== '' ? displayUserName.trim().charAt(0) : 'U'}
              </div>
            )}
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-slate-800 z-20" />
          </div>

          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-bold text-slate-200 text-xs leading-tight truncate capitalize">
                {displayUserName}
              </span>
              <span className="text-[10px] font-medium text-slate-400 tracking-wide mt-0.5">
                Account Summary &darr;
              </span>
            </div>
          )}

          {showUserDropdown && (
            <div 
              onClick={(e) => e.stopPropagation()} 
              className={`absolute top-16 bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${isSidebarCollapsed ? 'left-16 w-56' : 'left-2 w-56'}`}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-12 w-14 max-w-[48px] rounded-full overflow-hidden border border-slate-700 shadow-xs bg-slate-900">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayUserName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-full w-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center uppercase">
                      {displayUserName.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className="space-y-0.5 w-full">
                  <h4 className="text-xs font-bold text-slate-100 capitalize truncate">{displayUserName}</h4>
                  <p className="text-[10px] font-medium text-slate-400 truncate">{parsedUserData?.email || 'No email synced'}</p>
                </div>

                <div className="w-full border-t border-slate-700 pt-2 flex flex-col gap-1">
                  <button 
                    onClick={() => {
                      setShowUserDropdown(false);
                      navigate('/projects');
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-semibold text-slate-300 hover:bg-blue-950/50 hover:text-blue-400 transition-all text-left cursor-pointer"
                  >
                    <FolderSync size={13} />
                    <span>Switch Workspace</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Create Task Button */}
        <button 
          onClick={() => setIsCreateOpen(true)} 
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded flex items-center justify-center gap-2 shadow-sm transition-all text-sm mb-3 cursor-pointer ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}
          title="Create Task"
        >
          <Plus size={18} className="shrink-0" />
          {!isSidebarCollapsed && <span>Create Task</span>}
        </button>

        <button 
          onClick={() => setIsWidgetMenuOpen(true)} 
          className={`w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2 rounded flex items-center justify-center gap-2 transition-all text-sm mb-2 cursor-pointer ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}
          title="Add Custom Widget"
        >
          <LayoutGrid size={16} className="shrink-0" />
          {!isSidebarCollapsed && <span>Add Custom Widget</span>}
        </button>

        <a 
          href="#all-issues-table" 
          className={`w-full mt-2 text-slate-300 hover:bg-slate-700 py-2 rounded text-xs font-semibold flex items-center gap-2 transition-colors ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3'}`}
          title="All Workspace Issues"
        >
          <ListTodo size={14} className="text-slate-400 shrink-0" />
          {!isSidebarCollapsed && <span>All Workspace Issues</span>}
        </a>

        <div className="mt-auto border-t border-slate-700 pt-3">
          <button 
            onClick={handleLogout} 
            className={`w-full text-slate-400 hover:bg-slate-700 hover:text-red-400 py-2 rounded text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3'}`}
            title="Log Out"
          >
            <LogOut size={14} className="shrink-0" />
            {!isSidebarCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 min-w-0 p-6 md:p-8 overflow-y-auto space-y-12 bg-slate-900">
        
        {/* Workspace Header with Global Task ID Search */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-100">Custom Monitoring Workspace</h1>
          
          {/* Global Search By Task ID with Live Suggestions */}
          <div className="relative" ref={searchContainerRef}>
            <form onSubmit={handleGlobalSearchSubmit} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 shadow-xs">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search Task by ID (e.g., 56)..."
                value={globalSearchId}
                onChange={handleGlobalSearchChange}
                className="bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none w-48 md:w-60"
              />
              <button 
                type="submit" 
                disabled={searchingGlobal || !globalSearchId.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium px-2.5 py-1 rounded transition-all cursor-pointer disabled:opacity-40"
              >
                {searchingGlobal ? 'Finding...' : 'Go'}
              </button>
            </form>

            {searchSuggestions && (
              <div 
                onClick={() => {
                  setSearchSuggestions(null);
                  navigate(`/tasks/details?taskId=${searchSuggestions.id}`);
                }}
                className="absolute left-0 right-0 top-11 bg-slate-800 border border-slate-700 rounded-lg p-2.5 shadow-xl z-50 cursor-pointer hover:bg-slate-700/80 transition-all text-xs"
              >
                <div className="text-[10px] text-blue-400 font-mono font-bold mb-0.5">
                  <span>TASK-{searchSuggestions.id}</span>
                </div>
                <p className="text-slate-200 font-medium truncate">{searchSuggestions.title}</p>
              </div>
            )}
          </div>
        </div>

        <div>
          {loading ? (
            <div className="text-slate-400 text-xs">Syncing active workspace blocks...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {activeWidgets.map(widget => (
                <div key={widget.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm min-h-[450px] max-h-[600px] flex flex-col gap-3 group relative">
                  
                  <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                    <div className="flex items-center gap-2">
                      {widget.type === 'STATUS' && <Sliders size={14} className="text-blue-400" />}
                      {widget.type === 'PRIORITY' && <Layers size={14} className="text-amber-400" />}
                      {widget.type === 'TYPE' && <LayoutGrid size={14} className="text-purple-400" />}
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{widget.title}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleRemoveWidget(widget.id)}
                      className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Remove Widget Column"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                    {widget.items && widget.items.length > 0 ? (
                      widget.items.map(taskItem => (
                        <div 
                          key={taskItem.id}
                          onClick={() => navigate(`/tasks/details?taskId=${taskItem.id}`)}
                          className="bg-slate-900/60 p-4 rounded-md border border-slate-700 hover:border-blue-500 cursor-pointer transition-all space-y-2 group/card"
                        >
                          <h4 className="font-medium text-slate-200 text-xs line-clamp-2">{taskItem.title}</h4>
                          
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border font-bold ${TYPE_STYLES[taskItem.taskType?.toUpperCase()] || TYPE_STYLES.DEFAULT}`}>
                              {taskItem.taskType || 'TASK'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded border text-[9px] tracking-wide ${PRIORITY_STYLES[taskItem.priority?.toUpperCase()] || PRIORITY_STYLES.DEFAULT}`}>
                              {taskItem.priority}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded border text-[9px] tracking-wide ${STATUS_STYLES[taskItem.taskStatus?.toUpperCase()] || STATUS_STYLES.DEFAULT}`}>
                              {(taskItem.taskStatus || '').replace('_', ' ')}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] pt-1">
                            <span className="text-slate-400 font-mono">TASK-{taskItem.id}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskToDelete({ taskId: taskItem.id, widgetId: widget.id });
                              }}
                              className="text-slate-500 hover:text-red-400 hover:bg-red-950/50 p-1 rounded transition-colors opacity-0 group-hover/card:opacity-100 cursor-pointer"
                              title="Delete Task"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-xs italic py-12 text-center border border-dashed border-slate-700 rounded-md bg-slate-900/30">
                        No matching records detected
                      </div>
                    )}

                    {widget.hasMore && (
                      <button
                        type="button"
                        onClick={() => fetchWidgetData(widget, widget.page, true)}
                        className="w-full text-xs font-medium text-blue-400 hover:underline py-2 text-center block transition-all cursor-pointer"
                      >
                        Load more tasks...
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CORE SECTION 2: PAGINATED TRACKING REGISTRY TABLE */}
        <div id="all-issues-table" className="w-full bg-slate-800 rounded-xl border border-slate-700 shadow-sm font-sans text-xs text-slate-200 pt-1 relative min-h-[500px] overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ListTodo size={16} className="text-blue-400" />
              <h3 className="font-bold text-slate-100 text-sm tracking-wide">All Workspace Issues</h3>
              <button 
                onClick={fetchAllTasksTableData}
                disabled={loadingTable}
                className="ml-2 p-1 text-slate-400 hover:text-blue-400 bg-slate-900 border border-slate-700 hover:border-blue-500 shadow-sm rounded transition-all cursor-pointer disabled:opacity-50"
                title="Refresh Table Data"
              >
                <RefreshCw size={12} className={loadingTable ? "animate-spin text-blue-400" : ""} />
              </button>
            </div>

            {/* REAL-TIME SEARCH BAR & COLUMN PICKER */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              <div className="relative flex-1 max-w-xs min-w-[160px]">
                <input
                  type="text"
                  placeholder="Search tasks by ID, title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* COLUMN CHOOSER DROPDOWN */}
              <div className="relative" ref={columnMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowColumnDropdown(prev => !prev)}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg text-xs text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Choose visible columns"
                >
                  <Columns size={13} className="text-slate-400" />
                  <span>Columns</span>
                  {visibleOptionalCols.length > 0 && (
                    <span className="bg-blue-600 text-white rounded-full text-[9px] font-bold px-1.5 py-0.2">
                      +{visibleOptionalCols.length}
                    </span>
                  )}
                  <ChevronDown size={12} className="opacity-60 ml-0.5" />
                </button>

                {showColumnDropdown && (
                  <div className="absolute right-0 top-9 w-44 bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-100 flex flex-col gap-1">
                    <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700 mb-1">
                      Toggle Columns
                    </div>
                    {AVAILABLE_OPTIONAL_COLUMNS.map(col => {
                      const active = isColVisible(col.key);
                      return (
                        <button
                          key={col.key}
                          type="button"
                          onClick={() => toggleOptionalColumn(col.key)}
                          className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-slate-200 hover:bg-slate-700/70 transition-colors cursor-pointer text-left"
                        >
                          <span>{col.label}</span>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            active ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 bg-slate-900'
                          }`}>
                            {active && <Check size={10} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                disabled={allTasksPage === 0} 
                onClick={() => setAllTasksPage(p => p - 1)}
                className="p-1.5 border border-slate-700 rounded bg-slate-900 hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer text-slate-300"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-semibold text-slate-300 px-1">Page {allTasksPage + 1}</span>
              <button 
                disabled={allTasks.length < allTasksSize} 
                onClick={() => setAllTasksPage(p => p + 1)}
                className="p-1.5 border border-slate-700 rounded bg-slate-900 hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer text-slate-300"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            {loadingTable ? (
              <div className="p-12 text-slate-400 italic text-center">Refreshing workspace data index...</div>
            ) : (
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th onClick={() => handleSort('id')} className="py-3 px-3.5 w-24 cursor-pointer hover:bg-slate-700 transition-colors select-none">
                      <div className="flex items-center">Key / ID {renderSortIcon('id')}</div>
                    </th>
                    <th onClick={() => handleSort('title')} className="py-3 px-3.5 min-w-[200px] cursor-pointer hover:bg-slate-700 transition-colors select-none">
                      <div className="flex items-center">Summary Title {renderSortIcon('title')}</div>
                    </th>

                    {/* OPTIONAL TYPE COLUMN */}
                    {isColVisible('taskType') && (
                      <th onClick={() => handleSort('taskType')} className="py-3 px-3.5 w-28 cursor-pointer hover:bg-slate-700 transition-colors select-none">
                        <div className="flex items-center">Type {renderSortIcon('taskType')}</div>
                      </th>
                    )}

                    {/* DEFAULT STATUS COLUMN */}
                    <th onClick={() => handleSort('taskStatus')} className="py-3 px-3.5 w-32 cursor-pointer hover:bg-slate-700 transition-colors select-none">
                      <div className="flex items-center">Status {renderSortIcon('taskStatus')}</div>
                    </th>

                    {/* OPTIONAL PRIORITY COLUMN */}
                    {isColVisible('priority') && (
                      <th onClick={() => handleSort('priority')} className="py-3 px-3.5 w-28 cursor-pointer hover:bg-slate-700 transition-colors select-none">
                        <div className="flex items-center">Priority {renderSortIcon('priority')}</div>
                      </th>
                    )}

                    {/* OPTIONAL ASSIGNEE COLUMN */}
                    {isColVisible('assignee') && (
                      <th onClick={() => handleSort('assignee')} className="py-3 px-3.5 min-w-[130px] cursor-pointer hover:bg-slate-700 transition-colors select-none">
                        <div className="flex items-center">Assignee {renderSortIcon('assignee')}</div>
                      </th>
                    )}

                    {/* OPTIONAL REPORTER COLUMN */}
                    {isColVisible('reporter') && (
                      <th onClick={() => handleSort('reporter')} className="py-3 px-3.5 min-w-[130px] cursor-pointer hover:bg-slate-700 transition-colors select-none">
                        <div className="flex items-center">Reporter {renderSortIcon('reporter')}</div>
                      </th>
                    )}

                    {/* DEFAULT ACTIONS COLUMN */}
                    <th className="py-3 px-3.5 w-16 text-center select-none">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {sortedTasks.length > 0 ? (
                    sortedTasks.map((task) => (
                      <tr 
                        key={task.id} 
                        onClick={() => navigate(`/tasks/details?taskId=${task.id}`)}
                        className="hover:bg-slate-700/50 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-3.5 font-semibold text-blue-400 group-hover:underline whitespace-nowrap">
                          TASK-{task.id}
                        </td>
                        {/* Summary Title Cell with Text Wrapping Enabled */}
                        <td className="py-3 px-3.5 font-medium text-slate-100 max-w-xs md:max-w-md lg:max-w-lg whitespace-normal break-words" title={task.title}>
                          {task.title}
                        </td>

                        {/* TYPE CELL */}
                        {isColVisible('taskType') && (
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            {syncingTaskId === task.id ? (
                              <span className="text-[10px] text-slate-400 animate-pulse">Saving...</span>
                            ) : (
                              <button
                                onClick={(e) => triggerInlineMenuContainer(e, task.id, 'type')}
                                className={`flex items-center gap-1.5 font-bold text-[10px] uppercase border px-2 py-0.5 rounded-md shadow-2xs cursor-pointer ${COMPACT_TYPE_STYLES[task.taskType?.toUpperCase()] || COMPACT_TYPE_STYLES.DEFAULT}`}
                              >
                                {TABLE_TYPE_ICONS[task.taskType?.toUpperCase()] || TABLE_TYPE_ICONS.TASK}
                                <span>{task.taskType?.toLowerCase()}</span>
                                <ChevronDown size={10} className="text-slate-400" />
                              </button>
                            )}
                          </td>
                        )}
                        
                        {/* STATUS CELL */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          {syncingTaskId === task.id ? (
                            <span className="text-[10px] text-slate-400 animate-pulse">Saving...</span>
                          ) : (
                            <button
                              onClick={(e) => triggerInlineMenuContainer(e, task.id, 'status')}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold tracking-wide uppercase shadow-2xs cursor-pointer ${STATUS_STYLES[task.taskStatus?.toUpperCase()] || STATUS_STYLES.DEFAULT}`}
                            >
                              <span>{(task.taskStatus || '').replace('_', ' ')}</span>
                              <ChevronDown size={10} className="opacity-60" />
                            </button>
                          )}
                        </td>

                        {/* PRIORITY CELL */}
                        {isColVisible('priority') && (
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            {syncingTaskId === task.id ? (
                              <span className="text-[10px] text-slate-400 animate-pulse">Saving...</span>
                            ) : (
                              <button
                                onClick={(e) => triggerInlineMenuContainer(e, task.id, 'priority')}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold uppercase shadow-2xs cursor-pointer ${PRIORITY_STYLES[task.priority?.toUpperCase()] || PRIORITY_STYLES.DEFAULT}`}
                              >
                                <span>{task.priority?.toLowerCase()}</span>
                                <ChevronDown size={10} className="opacity-60" />
                              </button>
                            )}
                          </td>
                        )}

                        {/* ASSIGNEE CELL */}
                        {isColVisible('assignee') && (
                          <td className="py-3 px-3.5 text-slate-300 font-medium whitespace-nowrap">
                            <UserAvatar rawString={task.assignee} fallbackAvatarUrl={avatarUrl} size="w-5 h-5" />
                          </td>
                        )}

                        {/* REPORTER CELL */}
                        {isColVisible('reporter') && (
                          <td className="py-3 px-3.5 text-slate-300 font-medium whitespace-nowrap">
                            <UserAvatar rawString={task.reporter} fallbackAvatarUrl={avatarUrl} size="w-5 h-5" />
                          </td>
                        )}

                        {/* ACTIONS CELL */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation(); 
                              setTaskToDelete({ taskId: task.id, widgetId: null });
                            }}
                            className="text-slate-500 hover:text-red-400 hover:bg-red-950/50 p-1.5 rounded transition-all cursor-pointer inline-flex items-center"
                            title="Delete Task From Workspace"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4 + visibleOptionalCols.length} className="py-12 text-center text-slate-500 italic bg-slate-900/30">
                        No active workspace logs detected matching your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {activeInlineMenu && (
            <div 
              ref={inlineMenuRef}
              onClick={(e) => e.stopPropagation()}
              className="fixed bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-1.5 z-50 min-w-[160px] max-w-xs animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`
              }}
            >
              <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-700 mb-0.5 tracking-wider">
                Select {activeInlineMenu.fieldType}
              </div>

              {activeInlineMenu.fieldType === 'type' && 
                (metadata.taskTypes || ['STORY', 'BUG', 'TASK', 'EPIC']).map(opt => (
                  <button
                    key={opt}
                    onClick={() => executeInlineFieldMutation(activeInlineMenu.taskId, 'type', opt)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-700 text-xs font-semibold text-slate-200 capitalize flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    {TABLE_TYPE_ICONS[opt.toUpperCase()]}
                    <span>{opt.toLowerCase()}</span>
                  </button>
                ))
              }

              {activeInlineMenu.fieldType === 'status' && 
                (metadata.statuses || ['TO_DO', 'IN_PROGRESS', 'DONE']).map(opt => (
                  <button
                    key={opt}
                    onClick={() => executeInlineFieldMutation(activeInlineMenu.taskId, 'status', opt)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      opt === 'DONE' ? 'bg-green-500' : opt === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-400'
                    }`} />
                    <span>{opt.replace('_', ' ')}</span>
                  </button>
                ))
              }

              {activeInlineMenu.fieldType === 'priority' && 
                (metadata.priorities || ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).map(opt => (
                  <button
                    key={opt}
                    onClick={() => executeInlineFieldMutation(activeInlineMenu.taskId, 'priority', opt)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      opt === 'CRITICAL' ? 'bg-red-500' : opt === 'HIGH' ? 'bg-orange-500' : opt === 'MEDIUM' ? 'bg-slate-400' : 'bg-blue-400'
                    }`} />
                    <span className="capitalize">{opt.toLowerCase()}</span>
                  </button>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* DIALOG 1: CONFIG MENU */}
      {isWidgetMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex justify-center items-center z-50">
          <div className="bg-slate-800 w-full max-w-md rounded-lg shadow-xl p-6 border border-slate-700">
            <div className="flex justify-between items-center pb-4 border-b border-slate-700 mb-4">
              <h2 className="text-lg font-semibold text-slate-100">Configure Custom Widget Column</h2>
              <button onClick={() => setIsWidgetMenuOpen(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="space-y-5 text-xs">
              <div>
                <span className="block font-bold text-slate-400 uppercase tracking-wide mb-2">Filter By Status Lanes</span>
                <div className="flex flex-wrap gap-2">
                  {(metadata.statuses || []).map(status => (
                    <button key={status} type="button" onClick={() => handleAddCustomWidget('STATUS', status)} className="px-3 py-1.5 bg-slate-900 hover:bg-blue-950/50 hover:text-blue-400 rounded font-medium text-slate-300 transition-colors cursor-pointer border border-slate-700">
                      + {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="block font-bold text-slate-400 uppercase tracking-wide mb-2">Filter By Task Priorities</span>
                <div className="flex flex-wrap gap-2">
                  {(metadata.priorities || []).map(prio => (
                    <button key={prio} type="button" onClick={() => handleAddCustomWidget('PRIORITY', prio)} className="px-3 py-1.5 bg-slate-900 hover:bg-amber-950/50 hover:text-amber-400 rounded font-medium text-slate-300 transition-colors tracking-wide cursor-pointer border border-slate-700">
                      + {prio.charAt(0) + prio.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="block font-bold text-slate-400 uppercase tracking-wide mb-2">Filter By Issue Types</span>
                <div className="flex flex-wrap gap-2">
                  {(metadata.taskTypes || []).map(type => (
                    <button key={type} type="button" onClick={() => handleAddCustomWidget('TYPE', type)} className="px-3 py-1.5 bg-slate-900 hover:bg-purple-950/50 hover:text-purple-400 rounded font-medium text-slate-300 transition-colors cursor-pointer border border-slate-700">
                      + {type.charAt(0) + type.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 2: CREATE ISSUE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-slate-800 w-full max-w-2xl rounded-lg shadow-2xl border border-slate-700 flex flex-col max-h-[90vh] text-slate-100">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700">
              <h2 className="text-xl font-medium text-slate-100">Create issue</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-200 p-1 rounded cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Type *</label>
                  <select name="taskType" value={formData.taskType} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 text-xs outline-none">
                    {metadata.taskTypes.map(type => (
                      <option key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select name="taskStatus" value={formData.taskStatus} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 text-xs outline-none">
                    {metadata.statuses.map(status => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Summary / Title *</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea rows="4" name="description" value={formData.description} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 text-xs resize-none outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 text-xs outline-none">
                    {metadata.priorities.map(prio => (
                      <option key={prio} value={prio}>{prio.charAt(0) + prio.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assignee Email</label>
                  <input type="email" name="assignee" placeholder="user@example.com" value={formData.assignee} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 text-xs outline-none placeholder-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reporter Email *</label>
                  <input 
                    required 
                    type="email" 
                    name="reporter" 
                    placeholder="user@example.com" 
                    value={formData.reporter} 
                    onChange={handleChange} 
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-2 text-xs outline-none placeholder-slate-600" 
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-700 mt-6">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="hover:bg-slate-700 font-medium py-2 px-4 rounded text-slate-300 text-xs cursor-pointer">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 font-medium py-2 px-4 rounded text-white shadow-sm text-xs cursor-pointer">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 3: MODAL WINDOW CONFIRMATION POPUP */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex justify-center items-center z-50">
          <div className="bg-slate-800 w-full max-w-xs rounded-lg shadow-xl p-5 border border-slate-700 text-center animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-950/50 mb-3 text-red-400">
              <Trash2 size={18} />
            </div>
            <h3 className="text-base font-semibold text-slate-100 mb-1">Delete Task?</h3>
            <p className="text-xs text-slate-400 mb-4">
              Are you sure you want to permanently remove <strong>TASK-{taskToDelete.taskId}</strong>?
            </p>
            <div className="flex gap-2 justify-center">
              <button type="button" onClick={() => setTaskToDelete(null)} className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors cursor-pointer">Cancel</button>
              <button type="button" onClick={handleDeleteWidgetTask} className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded shadow-sm transition-colors cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}