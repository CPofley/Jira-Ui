import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  RefreshCw
} from 'lucide-react'; 

const DEFAULT_WIDGETS = [
  { id: 'w-todo', title: 'To Do Lane', type: 'STATUS', value: 'TO_DO', page: 0, hasMore: true, items: [] },
  { id: 'w-inprogress', title: 'In Progress Lane', type: 'STATUS', value: 'IN_PROGRESS', page: 0, hasMore: true, items: [] }
];

const STATUS_STYLES = {
  TO_DO: 'bg-slate-100 text-slate-700 border-slate-300',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  DONE: 'bg-green-50 text-green-700 border-green-200',
  DEFAULT: 'bg-slate-50 text-slate-600 border-slate-200'
};

const PRIORITY_STYLES = {
  LOW: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold',
  MEDIUM: 'bg-slate-100 text-slate-700 border-slate-300 font-semibold',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200 font-bold',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200 font-extrabold animate-pulse',
  DEFAULT: 'bg-slate-50 text-slate-600 border-slate-200'
};

const TYPE_STYLES = {
  STORY: 'bg-green-600 text-white border-transparent',
  BUG: 'bg-red-600 text-white border-transparent',
  TASK: 'bg-blue-500 text-white border-transparent',
  EPIC: 'bg-purple-600 text-white border-transparent',
  DEFAULT: 'bg-slate-50 text-slate-500 text-white border-transparent'
};

const TABLE_TYPE_ICONS = {
  STORY: <Bookmark size={14} className="fill-current text-green-600" />,
  BUG: <Bug size={14} className="text-red-600" />,
  TASK: <CheckSquare size={14} className="text-blue-500" />,
  EPIC: <Zap size={14} className="fill-current text-purple-600" />
};

export default function JiraDashboard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // 🔴 CENTRALIZED LOGOUT LOGIC
  const handleLogout = () => {
    localStorage.removeItem('jira_token');
    localStorage.removeItem('jira_user');
    localStorage.removeItem('jira_user_avatar');
    navigate('/login', { replace: true });
  };

  // 🔴 UPDATED AUTH HEADERS: Automatically triggers logout if token is entirely missing
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

  // States for the 'All Tasks' paginated table view
  const [allTasks, setAllTasks] = useState([]);
  const [allTasksPage, setAllTasksPage] = useState(0);
  const [allTasksSize] = useState(20);
  const [loadingTable, setLoadingTable] = useState(true);

  // Sorting States
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
        apiUrl = `http://localhost:8080/api/tasks/by-status/${projectId}?status=${widget.value}&page=${pageNum}&size=${PAGE_SIZE}`;
      } else if (widget.type === 'PRIORITY') {
        apiUrl = `http://localhost:8080/api/tasks/by-priority/${projectId}?priority=${widget.value}&page=${pageNum}&size=${PAGE_SIZE}`;
      } else if (widget.type === 'TYPE') {
        apiUrl = `http://localhost:8080/api/tasks/by-task-type/${projectId}?type=${widget.value}&page=${pageNum}&size=${PAGE_SIZE}`;
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
      const response = await fetch(`http://localhost:8080/api/tasks/project/${projectId}?page=${allTasksPage}&size=${allTasksSize}`, {
        headers: getAuthHeaders() 
      });
      
      if (response.status === 401) {
        console.error("Unauthorized! Token is expired, forcing logout.");
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
  
  const handleDeleteWidgetTask = async () => {
    if (!taskToDelete) return;
    const { taskId, widgetId } = taskToDelete;

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
        const configRes = await fetch('http://localhost:8080/api/tasks/config', {
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

  // --- SORTING ENGINE METHODS ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTasks = useMemo(() => {
    if (!allTasks) return [];
    
    let sortableTasks = [...allTasks];
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
  }, [allTasks, sortConfig]);

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={12} className="text-slate-300 ml-1 inline-block" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={12} className="text-blue-600 font-bold ml-1 inline-block" /> 
      : <ArrowDown size={12} className="text-blue-600 font-bold ml-1 inline-block" />;
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

      const response = await fetch('http://localhost:8080/api/tasks/create', {
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

  // Helper values for dynamic avatar display logic
  const storedUserRaw = localStorage.getItem('jira_user');
  
  // 🟢 Parse User Object Details Safely
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

  // 🟢 FIXED: Cross-check both direct 'jira_user_avatar' key AND the backend API's 'pictureUrl' property context
  const avatarUrl = useMemo(() => {
    let rawUrl = localStorage.getItem('jira_user_avatar');
    
    // If explicit avatar key isn't there, pull it out from the active parsed user object mapping block
    if ((!rawUrl || rawUrl === 'null' || rawUrl === 'undefined') && parsedUserData) {
      rawUrl = parsedUserData.pictureUrl || parsedUserData.picture;
    }

    if (!rawUrl) return null;
    
    // De-serialize quotes if any exist
    if (rawUrl.startsWith('"') && rawUrl.endsWith('"')) {
      try { return JSON.parse(rawUrl); } catch (e) { return rawUrl.replace(/^"|"$/g, ''); }
    }
    return rawUrl;
  }, [parsedUserData]);

  useEffect(() => {
    console.log("Workspace Profile Diagnostics:", {
      rawUser: storedUserRaw,
      resolvedName: displayUserName,
      avatarUrl: avatarUrl
    });
  }, [storedUserRaw, displayUserName, avatarUrl]);

  return (
    <div className="flex h-screen w-screen bg-slate-50 font-sans text-slate-800 text-left overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col p-4 shadow-sm">
        
        {/* Safe Dynamic Profile Header with strictly validated conditional rendering */}
        <div 
          onClick={() => navigate('/projects')} 
          className="flex items-center gap-3 px-2 py-2.5 mb-4 border border-transparent hover:border-slate-200 hover:bg-slate-50 hover:shadow-xs rounded-xl cursor-pointer transition-all group"
          title="Switch Workspace"
        >
          <div className="relative h-9 w-9 flex-shrink-0">
            {avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined' && avatarUrl.trim() !== '' ? (
              <img 
                src={avatarUrl} 
                alt="User Profile" 
                className="h-full w-full rounded-full object-cover border border-slate-200 shadow-xs"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUserName)}&background=2563eb&color=fff`;
                }}
              />
            ) : (
              <div className="h-full w-full rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-inner uppercase">
                {displayUserName && displayUserName.trim() !== '' ? displayUserName.trim().charAt(0) : 'U'}
              </div>
            )}
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-slate-700 text-xs leading-tight truncate capitalize">
              {displayUserName}
            </span>
            <span className="text-[10px] font-medium text-slate-400 group-hover:text-blue-500 transition-colors truncate">
              Switch Workspace &rarr;
            </span>
          </div>
        </div>
        
        <button onClick={() => setIsCreateOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center justify-center gap-2 shadow-sm transition-all text-sm mb-3 cursor-pointer">
          <Plus size={18} />
          <span>Create Task</span>
        </button>

        <button onClick={() => setIsWidgetMenuOpen(true)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded flex items-center justify-center gap-2 transition-all text-sm mb-2 cursor-pointer">
          <LayoutGrid size={16} />
          <span>Add Custom Widget</span>
        </button>

        <a href="#all-issues-table" className="w-full mt-2 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded text-xs font-semibold flex items-center gap-2 transition-colors">
          <ListTodo size={14} className="text-slate-400" />
          <span>All Workspace Issues</span>
        </a>

        <div className="mt-auto border-t border-slate-100 pt-3">
          <button onClick={handleLogout} className="w-full text-slate-500 hover:bg-slate-50 hover:text-red-600 px-3 py-2 rounded text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer">
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 p-8 overflow-y-auto space-y-12">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-6">Custom Monitoring Workspace</h1>
          
          {loading ? (
            <div className="text-slate-500 text-xs">Syncing active workspace blocks...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {activeWidgets.map(widget => (
                <div key={widget.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-h-[450px] max-h-[600px] flex flex-col gap-3 group relative">
                  
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      {widget.type === 'STATUS' && <Sliders size={14} className="text-blue-500" />}
                      {widget.type === 'PRIORITY' && <Layers size={14} className="text-amber-500" />}
                      {widget.type === 'TYPE' && <LayoutGrid size={14} className="text-purple-500" />}
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{widget.title}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleRemoveWidget(widget.id)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
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
                          className="bg-slate-50 p-4 rounded-md border border-slate-200 hover:border-blue-400 cursor-pointer transition-all space-y-2 group/card"
                        >
                          <h4 className="font-medium text-slate-900 text-xs line-clamp-2">{taskItem.title}</h4>
                          
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border font-bold ${TYPE_STYLES[taskItem.taskType] || TYPE_STYLES.DEFAULT}`}>
                              {taskItem.taskType || 'TASK'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded border text-[9px] tracking-wide ${PRIORITY_STYLES[taskItem.priority] || PRIORITY_STYLES.DEFAULT}`}>
                              {taskItem.priority}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded border text-[9px] tracking-wide ${STATUS_STYLES[taskItem.taskStatus] || STATUS_STYLES.DEFAULT}`}>
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
                              className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors opacity-0 group-hover/card:opacity-100 cursor-pointer"
                              title="Delete Task"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 text-xs italic py-12 text-center border border-dashed border-slate-100 rounded-md bg-slate-50/50">
                        No matching records detected
                      </div>
                    )}

                    {widget.hasMore && (
                      <button
                        type="button"
                        onClick={() => fetchWidgetData(widget, widget.page, true)}
                        className="w-full text-xs font-medium text-blue-600 hover:underline py-2 text-center block transition-all cursor-pointer"
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
        <div id="all-issues-table" className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden font-sans text-xs text-slate-700 pt-1">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ListTodo size={16} className="text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm tracking-wide">All Workspace Issues</h3>
			  <button 
                onClick={fetchAllTasksTableData}
                disabled={loadingTable}
                className="ml-2 p-1 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 shadow-sm rounded transition-all cursor-pointer disabled:opacity-50"
                title="Refresh Table Data"
              >
                <RefreshCw size={12} className={loadingTable ? "animate-spin text-blue-500" : ""} />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                disabled={allTasksPage === 0} 
                onClick={() => setAllTasksPage(p => p - 1)}
                className="p-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-semibold text-slate-600 px-1">Page {allTasksPage + 1}</span>
              <button 
                disabled={allTasks.length < allTasksSize} 
                onClick={() => setAllTasksPage(p => p + 1)}
                className="p-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            {loadingTable ? (
              <div className="p-12 text-slate-400 italic text-center">Refreshing workspace data index...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th onClick={() => handleSort('id')} className="py-3 px-4 w-24 cursor-pointer hover:bg-slate-100 transition-colors select-none">
                      <div className="flex items-center">Key / ID {renderSortIcon('id')}</div>
                    </th>
                    <th onClick={() => handleSort('title')} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none">
                      <div className="flex items-center">Summary Title {renderSortIcon('title')}</div>
                    </th>
                    <th onClick={() => handleSort('taskType')} className="py-3 px-4 w-28 cursor-pointer hover:bg-slate-100 transition-colors select-none">
                      <div className="flex items-center">Type {renderSortIcon('taskType')}</div>
                    </th>
                    <th onClick={() => handleSort('taskStatus')} className="py-3 px-4 w-32 cursor-pointer hover:bg-slate-100 transition-colors select-none">
                      <div className="flex items-center">Status {renderSortIcon('taskStatus')}</div>
                    </th>
                    <th onClick={() => handleSort('priority')} className="py-3 px-4 w-28 cursor-pointer hover:bg-slate-100 transition-colors select-none">
                      <div className="flex items-center">Priority {renderSortIcon('priority')}</div>
                    </th>
                    <th onClick={() => handleSort('assignee')} className="py-3 px-4 w-36 cursor-pointer hover:bg-slate-100 transition-colors select-none">
                      <div className="flex items-center">Assignee {renderSortIcon('assignee')}</div>
                    </th>
                    <th onClick={() => handleSort('reporter')} className="py-3 px-4 w-36 cursor-pointer hover:bg-slate-100 transition-colors select-none">
                      <div className="flex items-center">Reporter {renderSortIcon('reporter')}</div>
                    </th>
                    <th className="py-3 px-4 w-16 text-center select-none">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedTasks.length > 0 ? (
                    sortedTasks.map((task) => (
                      <tr 
                        key={task.id} 
                        onClick={() => navigate(`/tasks/details?taskId=${task.id}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4 font-semibold text-blue-600 group-hover:underline whitespace-nowrap">
                          TASK-{task.id}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate" title={task.title}>
                          {task.title}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold text-[10px] text-slate-600 uppercase">
                            {TABLE_TYPE_ICONS[task.taskType?.toUpperCase()] || TABLE_TYPE_ICONS.TASK}
                            <span>{task.taskType?.toLowerCase()}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold tracking-wide uppercase ${STATUS_STYLES[task.taskStatus] || STATUS_STYLES.DEFAULT}`}>
                            {(task.taskStatus || '').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.DEFAULT}`}>
                            {task.priority?.toLowerCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {task.assignee || <span className="text-slate-400 italic font-normal">Unassigned</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-medium whitespace-nowrap">
                          {task.reporter || <span className="text-slate-400 italic font-normal">System</span>}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation(); 
                              setTaskToDelete({ taskId: task.id, widgetId: null });
                            }}
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-all cursor-pointer inline-flex items-center"
                            title="Delete Task From Workspace"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400 italic bg-slate-50/30">
                        No active workspace logs detected in this page index slot.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* DIALOG 1: CONFIG MENU */}
      {isWidgetMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Configure Custom Widget Column</h2>
              <button onClick={() => setIsWidgetMenuOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="space-y-5 text-xs">
              <div>
                <span className="block font-bold text-slate-500 uppercase tracking-wide mb-2">Filter By Status Lanes</span>
                <div className="flex flex-wrap gap-2">
                  {(metadata.statuses || []).map(status => (
                    <button key={status} type="button" onClick={() => handleAddCustomWidget('STATUS', status)} className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded font-medium text-slate-700 transition-colors cursor-pointer">
                      + {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="block font-bold text-slate-500 uppercase tracking-wide mb-2">Filter By Task Priorities</span>
                <div className="flex flex-wrap gap-2">
                  {(metadata.priorities || []).map(prio => (
                    <button key={prio} type="button" onClick={() => handleAddCustomWidget('PRIORITY', prio)} className="px-3 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 rounded font-medium text-slate-700 transition-colors tracking-wide cursor-pointer">
                      + {prio.charAt(0) + prio.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="block font-bold text-slate-500 uppercase tracking-wide mb-2">Filter By Issue Types</span>
                <div className="flex flex-wrap gap-2">
                  {(metadata.taskTypes || []).map(type => (
                    <button key={type} type="button" onClick={() => handleAddCustomWidget('TYPE', type)} className="px-3 py-1.5 bg-slate-100 hover:bg-purple-50 hover:text-purple-600 rounded font-medium text-slate-700 transition-colors cursor-pointer">
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h2 className="text-xl font-medium text-slate-900">Create issue</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Issue Type *</label>
                  <select name="taskType" value={formData.taskType} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs outline-none">
                    {metadata.taskTypes.map(type => (
                      <option key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                  <select name="taskStatus" value={formData.taskStatus} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs outline-none">
                    {metadata.statuses.map(status => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Summary / Title *</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full border border-slate-300 rounded p-2 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea rows="4" name="description" value={formData.description} onChange={handleChange} className="w-full border border-slate-300 rounded p-2 text-xs resize-none outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs outline-none">
                    {metadata.priorities.map(prio => (
                      <option key={prio} value={prio}>{prio.charAt(0) + prio.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Assignee Email</label>
                  <input type="email" name="assignee" placeholder="user@example.com" value={formData.assignee} onChange={handleChange} className="w-full border border-slate-300 rounded p-2 text-xs outline-none" />
                </div>
				 <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reporter Email *</label>
                  <input 
                    required 
                    type="email" 
                    name="reporter" 
                    placeholder="user@example.com" 
                    value={formData.reporter} 
                    onChange={handleChange} 
                    className="w-full border border-slate-300 rounded p-2 text-xs outline-none" 
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="hover:bg-slate-100 font-medium py-2 px-4 rounded text-slate-600 text-xs cursor-pointer">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 font-medium py-2 px-4 rounded text-white shadow-sm text-xs cursor-pointer">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 3: MODAL WINDOW CONFIRMATION POPUP */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-xs rounded-lg shadow-xl p-5 border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-50 mb-3">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Delete Task?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to permanently remove <strong>TASK-{taskToDelete.taskId}</strong>?
            </p>
            <div className="flex gap-2 justify-center">
              <button type="button" onClick={() => setTaskToDelete(null)} className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer">Cancel</button>
              <button type="button" onClick={handleDeleteWidgetTask} className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded shadow-sm transition-colors cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}