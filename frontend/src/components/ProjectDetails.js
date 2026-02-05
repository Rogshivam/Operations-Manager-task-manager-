import React, { useState, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiPlus,
  FiUsers,
  FiCalendar,
  FiUser,
  FiLogOut,
  FiEdit3,
  FiTrash2,
  FiX
} from "react-icons/fi";
import DarkModeToggle from "./DarkModeToggle";
import "./ProjectDetails.css";
import { tasksAPI, projectsAPI } from "../services/api";
import SingleFileUploader from './SingleFileUploader';

const normalizeProject = (p) => ({
  ...p,
  id: p.id || p._id || p.projectId,
  tasks: (p.tasks || []).map((t) => ({ ...t, id: t.id || t._id })),
  teamMembers: p.teamMembers || [],
});


const ProjectDetails = ({ currentUser, onLogout }) => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selection State (SAME as Dashboard)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // 📄 Task Document View (read-only)
  const [viewingTask, setViewingTask] = useState(null);

  // Task/project editing state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: ''
  });

  // Task editing state
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  //  NEW: Temp attachments for create modal
  const [tempAttachments, setTempAttachments] = useState([]);

  // Task Selection Functions (IDENTICAL to Dashboard)
  const handleLongPressStart = useCallback((taskId) => {
    const timer = setTimeout(() => {
      setSelectionMode(true);
      if (!selectedTasks.includes(taskId)) {
        setSelectedTasks([taskId]);
      }
    }, 2000); // 2 seconds
    setLongPressTimer({ taskId, timer });
  }, [selectedTasks]);

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer.timer);
      setLongPressTimer(null);
    }
  };

  const handleTaskPress = useCallback((taskId) => {
    if (!selectionMode) return;

    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  }, [selectionMode]);

  // ✅ NEW: Bulk Delete Tasks
  const handleBulkDeleteTasks = async () => {
    if (selectedTasks.length === 0) return;

    try {
      await Promise.all(
        selectedTasks.map(id =>
          tasksAPI.delete(id, { credentials: "include" })
        )
      );

      await loadProject(); // Refresh data
      clearSelection();
    } catch (err) {
      console.error(err);
      alert('Error deleting tasks');
    }
  };

  // Single task delete
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await tasksAPI.delete(taskId, { credentials: "include" });
      await loadProject();
    } catch (err) {
      console.error(err);
      alert("Failed to delete task");
    }
  };

  const clearSelection = useCallback(() => {
    setSelectedTasks([]);
    setSelectionMode(false);
    setLongPressTimer(null);
  }, []);
  //  useCallback + deps array
  // const loadProject = useCallback(async () => {
  //   setLoading(true);
  //   setError(null);
  //   try {
  //     const projectRes = await projectsAPI.getById(projectId, { credentials: "include" });
  //     const proj = normalizeProject(projectRes.data?.project || projectRes.data);


  //     // Fetch tasks if not included in project
  //     if (!proj.tasks || proj.tasks.length === 0) {
  //       try {
  //         const tasksRes = await tasksAPI.getAll({ projectId }, { credentials: "include" });
  //         proj.tasks = (tasksRes?.data?.tasks || tasksRes?.data || []).map(
  //           (t) => ({ ...t, id: t.id || t._id })
  //         );
  //       } catch {
  //         // ignore
  //       }
  //     }


  //     setProject(proj);
  //     // setEditProject({
  //     //   name: proj.name || "",
  //     //   description: proj.description || "",
  //     //   startDate: proj.startDate || "",
  //     //   endDate: proj.endDate || "",
  //     // });
  //   } catch (err) {
  //     console.error(err);
  //     setError(err.message || "Failed to load project");
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [projectId]);

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get project WITHOUT tasks
      const projectRes = await projectsAPI.getById(projectId, { credentials: "include" });
      const proj = normalizeProject(projectRes.data?.project || projectRes.data);

      // 2. ✅ FORCE project-specific tasks ONLY
      const tasksParams = {
        projectId: projectId,        // Filter by THIS project
        limit: 1000,                 // Get ALL tasks for this project
        page: 1
      };

      const tasksRes = await tasksAPI.getAll(tasksParams, { credentials: "include" });

      // 3. ✅ ONLY assign tasks WHERE project ID matches
      proj.tasks = (tasksRes?.data?.tasks || [])
        .filter(task => task.project?._id === projectId || task.project === projectId)
        .map(t => ({ ...t, id: t.id || t._id }));

      // console.log(`✅ Project ${proj.name}: ${proj.tasks.length} tasks loaded`);
      setProject(proj);

    } catch (err) {
      console.error('🚨 loadProject ERROR:', err);
      setError(err.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);


  // . FIXED #2: Proper useEffect deps
  useEffect(() => {
    if (projectId) loadProject();
  }, [projectId, loadProject]);


  // Create Task (API)
  const handleCreateTask = useCallback(async (e) => {
    e.preventDefault();
    if (!currentUser || !newTask.title.trim()) {
      alert("Title is required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', newTask.title);
      formData.append('description', newTask.description);
      formData.append('projectId', project.id);
      formData.append('assignedTo', newTask.assignedTo);
      formData.append('priority', newTask.priority);
      formData.append('dueDate', newTask.dueDate || '');
      formData.append('status', 'pending');
      formData.append('createdBy', currentUser.id || currentUser._id);

      // ✅ Add temp files
      tempAttachments.forEach((file, index) => {
        formData.append('attachments', file);
      });

      // await tasksAPI.create(formData, {
      //   credentials: "include" // ✅ Let browser set Content-Type
      // });
      const res = await tasksAPI.create(formData, { credentials: "include" });
      const createdTaskId = res.data.task._id;

      // upload attachments AFTER task exists
      for (const file of tempAttachments) {
        const fd = new FormData();
        fd.append("file", file);
        await tasksAPI.uploadSingleAttachment(createdTaskId, fd);
      }

      setTempAttachments([]);
      await loadProject();
      setIsTaskModalOpen(false);
      setNewTask({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
    } catch (err) {
      console.error('❌ ERROR:', err);
      alert(err.response?.data?.message || "Failed to create task");
    }
  }, [currentUser, newTask, project?.id, tempAttachments, loadProject]);
  //   ✅ SingleFileUploader callback for CREATE
  //   const handleFileUploadSuccess = (fileData) => {
  //     setTempAttachments(prev => [...prev, fileData.file]);
  //     console.log('✅ Temp file stored:', fileData.file.name);
  //   };
  // FIXED: Safe handleFileUploadSuccess with useCallback
  // const handleFileUploadSuccess = useCallback((fileData) => {
  //   if (fileData?.file) {
  //     setTempAttachments(prev => [...prev, fileData.file]);
  //     console.log('✅ Temp file stored:', fileData.file.name);
  //   }
  // }, []);

  // Update Task (API) - Quick status update
  // const handleUpdateTask = async (taskId, updates) => {
  //   try {
  //     await tasksAPI.update(taskId, updates, { credentials: "include" });
  //     await loadProject();
  //   } catch (err) {
  //     console.error(err);
  //     alert("Failed to update task");
  //   }
  // };
  const handleUpdateTask = async (taskId, updates) => {
    try {
      await tasksAPI.update(taskId, updates, { credentials: "include" });
      await loadProject();
    } catch (err) {
      console.error(err);
      alert("Failed to update task");
    }
  };



  // . FIXED #1: Remove unused handleUpdateProject (not used in UI)


  // Utility Functions
  const getTaskStats = () => {
    const total = project?.tasks?.length || 0;
    const completed = project?.tasks?.filter(t => t.status === 'completed').length || 0;
    const pending = project?.tasks?.filter(t => t.status === 'pending').length || 0;
    const inProgress = project?.tasks?.filter(t => t.status === 'in_progress').length || 0;
    return { total, completed, pending, inProgress };
  };


  const canManageProject = () => {
    return currentUser?.role === 'manager' &&
      (project?.manager?._id === currentUser?.id ||
        project?.managerId === currentUser?.id);
  };


  const canAssignTasks = () => {
    return currentUser?.role === 'team_lead' || canManageProject();
  };


  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#ffa502';
    }
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#2ed573';
      case 'in_progress': return '#3742fa';
      case 'pending': return '#ffa502';
      default: return '#ffa502';
    }
  };


  // . FIXED #5: Inline getUserName usage (no separate function needed)
  const openEditTaskModal = (task) => {
    setEditingTask({
      id: task.id || task._id,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo?._id || task.assignedTo || '',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
    });
    setIsEditTaskModalOpen(true);
  };


  // Update Task (Full Edit)
  const handleUpdateTaskFull = async (e) => {
    e.preventDefault();
    if (!editingTask || !currentUser) return;


    try {
      const payload = {
        title: editingTask.title,
        description: editingTask.description,
        assignedTo: editingTask.assignedTo,
        priority: editingTask.priority,
        status: editingTask.status,
        dueDate: editingTask.dueDate || undefined,
      };


      await tasksAPI.update(editingTask.id, payload, { credentials: "include" });
      await loadProject();
      setIsEditTaskModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      console.error('❌ Update task error:', err);
      alert(err.response?.data?.message || "Failed to update task");
    }
  };


  // Render states
  if (loading) return <div className="loading">Loading project...</div>;
  if (error) return <div className="loading error">Error: {error}</div>;
  if (!project) return <div className="loading">Project not found</div>;


  const stats = getTaskStats();
  // console.log("project detail:", project);


  return (
    <div className="project-details">
      <header className="project-header">
        <div className="header-left">
          <Link to={`/dashboard/${projectId}`} className="back-btn">
            <FiArrowLeft /> Back to Dashboard
          </Link>
          <div className="project-info">
            <h1>{project.name}</h1>
            <p>{project.description}</p>
          </div>
        </div>
        <div className="header-right">
          {selectionMode && (
            <div className="selection-header">
              <span>{selectedTasks.length} tasks selected</span>
              <button className="select-cancel" onClick={clearSelection}>
                <FiX /> Cancel
              </button>
              {selectedTasks.length > 0 && canAssignTasks() && (
                <button className="select-delete" onClick={() => setIsDeleteConfirmOpen(true)}>
                  <FiTrash2 /> Delete ({selectedTasks.length})
                </button>
              )}
            </div>
          )}
          <div className="user-info">
            <FiUser />
            <span>{currentUser?.username} ({currentUser?.role?.replace('_', ' ')})</span>
          </div>
          <DarkModeToggle />
          <button className="logout-btn" onClick={onLogout}>
            <FiLogOut /> Logout
          </button>
        </div>
      </header>


      <div className="project-content">
        <div className="project-overview">
          <div className="overview-stats">
            <div className="stat-card">
              <h3>{stats.total}</h3>
              <p>Total Tasks</p>
            </div>
            <div className="stat-card completed">
              <h3>{stats.completed}</h3>
              <p>Completed</p>
            </div>
            <div className="stat-card in-progress">
              <h3>{stats.inProgress}</h3>
              <p>In Progress</p>
            </div>
            <div className="stat-card pending">
              <h3>{stats.pending}</h3>
              <p>Pending</p>
            </div>
          </div>


          <div className="project-meta">
            <div className="meta-item">
              <FiCalendar />
              <div>
                <span className="label">Timeline</span>
                <span className="value">
                  {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="meta-item">
              <FiUsers />
              <div>
                <span className="label">Team Members</span>
                <span className="value">{(project.teamMembers || []).length}</span>
              </div>
            </div>
            <div className="meta-item">
              <FiUser />
              <div>
                <span className="label">Manager</span>
                <span className="value">
                  {project.managerName ||
                    `${project.manager?.firstName || ''} ${project.manager?.lastName || ''}`.trim()}
                </span>
              </div>
            </div>
          </div>
        </div>


        <div className="tasks-section">
          <div className="section-header">
            <h2>Tasks</h2>
            <div className="header-actions">
              {canAssignTasks() && (
                <button
                  className="create-task-btn"
                  onClick={() => setIsTaskModalOpen(true)}
                >
                  <FiPlus /> Add Task
                </button>
              )}
            </div>
          </div>


          <div className="tasks-grid">
            {project.tasks.map(task => {
              const taskId = task.id || task._id;
              const isSelected = selectedTasks.includes(taskId);

              return (
                <div
                  key={taskId}
                  className={`task-card ${isSelected ? 'selected' : ''}`}
                  // onClick={() => handleTaskPress(taskId)}
                  onClick={() => {
                    if (selectionMode) {
                      handleTaskPress(taskId);     // selection behavior
                    } else {
                      setViewingTask(task);        // open document view
                    }
                  }}

                  onMouseDown={() => handleLongPressStart(taskId)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(taskId)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchCancel={handleLongPressEnd}
                >
                  {/* Selection checkbox */}
                  {selectionMode && (
                    <div className="task-checkbox">
                      <input type="checkbox" checked={isSelected} readOnly />
                    </div>
                  )}

                  {/* Long press hint */}
                  {!selectionMode && (
                    <div className="long-press-hint"></div>
                  )}

                  <div className="task-header">
                    <h3>{task.title}</h3>
                    <div className="task-badges">
                      <span
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(task.priority) }}
                      >
                        {task.priority}
                      </span>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(task.status) }}
                      >
                        {task.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <p className="task-description">{task.description}</p>

                  <div className="task-meta">
                    <div className="meta-item">
                      <span className="label">Assigned to:</span>
                      <span className="value">
                        {task.assignedTo?.firstName
                          ? `${task.assignedTo.firstName} ${task.assignedTo.lastName || ''}`.trim()
                          : task.assignedTo || 'Unassigned'}
                      </span>
                    </div>

                    {task.dueDate && (
                      <div className="meta-item">
                        <span className="label">Due:</span>
                        <span className="value">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Hide actions in selection mode */}
                  {!selectionMode && (
                    <div className="task-actions">
                      {task.assignedTo?._id === currentUser?.id || task.assignedTo === currentUser?.id ? (
                        <select
                          value={task.status}
                          onChange={(e) => handleUpdateTask(taskId, { status: e.target.value })}
                          className="status-select"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      ) : null}

                      {canAssignTasks() && (
                        <>
                          <button
                            className="edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditTaskModal(task);
                            }}
                            title="Edit Task"
                          >
                            <FiEdit3 />
                          </button>
                          <button
                            className="delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(taskId);
                            }}
                          >
                            <FiTrash2 />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>



          {project.tasks.length === 0 && (
            <div className="empty-state">
              <FiPlus size={48} />
              <h3>No tasks yet</h3>
              <p>Get started by creating the first task for this project.</p>
            </div>
          )}
        </div>
      </div>

      {/* ✅ NEW: Bulk Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Delete {selectedTasks.length} Task{selectedTasks.length !== 1 ? 's' : ''}?</h2>
              <button className="close-btn" onClick={() => setIsDeleteConfirmOpen(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>This action cannot be undone. Are you sure?</p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary danger"
                onClick={handleBulkDeleteTasks}
              >
                <FiTrash2 /> Delete Tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <div className="modal">
          <div className=" task-viewer">
            <div className="modal-header">
              <h2>Create New Task</h2>
              <button className="close-btn" onClick={() => {
                setIsTaskModalOpen(false);
                setTempAttachments([]);
              }}>
                ×
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  required
                  rows="3"
                />
              </div>

              {/* ✅ SIMULTANEOUS UPLOAD - Works NOW! */}
              <div className="form-group">
                <label>Attachments</label>
                {/* <SingleFileUploader
                  taskId="temp_create"
                  onUploadSuccess={handleFileUploadSuccess}
                  maxSizeMB={5}
                /> */}
                <input
                  type="file"
                  multiple
                  onChange={(e) => setTempAttachments([...e.target.files])}
                />
                {/* ✅ Show uploaded files */}
                {tempAttachments.length > 0 && (
                  <div className="temp-attachments">
                    <small>📎 {tempAttachments.length} file{tempAttachments.length > 1 ? 's' : ''} ready to upload</small>
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Assign To</label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    required
                  >
                    <option value="">Select Team Member</option>
                    {(project.teamMembers || []).map(member => {
                      const memberId = member.user?._id || member.userId || member.id;
                      const displayName = member.user?.firstName
                        ? `${member.user.firstName} ${member.user.lastName || ''}`.trim()
                        : 'Unknown User';
                      return (
                        <option key={memberId} value={memberId}>
                          {displayName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsTaskModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {isEditTaskModalOpen && editingTask && (
        <div className="modal">
          <div className="task-viewer">
            <div className="modal-header">
              <h2>Edit Task</h2>
              <button
                className="close-btn "
                onClick={() => {
                  setIsEditTaskModalOpen(false);
                  setEditingTask(null);
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateTaskFull}>
              <div className="form-group">
                <label>Task Title</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  required
                />
              </div>
              {/* // In Edit Task Modal  */}
              <SingleFileUploader
                taskId={editingTask.id || editingTask._id}
                onUploadSuccess={async (updatedTask) => {
                  setTempAttachments(prev => [...prev, updatedTask.file]);
                  setEditingTask(updatedTask);
                  // await loadProject();

                }}
              />
              {/* <SingleFileUploader
  taskId="temp_edit"
  onUploadSuccess={(data) => {
    setTempAttachments(prev => [...prev, data.file]);
  }}
/> */}

              <div className="form-row">
                <div className="form-group">
                  <label>Assign To</label>
                  <select
                    value={editingTask.assignedTo}
                    onChange={(e) => setEditingTask({ ...editingTask, assignedTo: e.target.value })}
                    required
                  >
                    <option value="">Select Team Member</option>
                    {(project.teamMembers || []).map(member => {
                      const memberId = member.user?._id || member.userId || member.id;
                      const displayName = member.user?.firstName
                        ? `${member.user.firstName} ${member.user.lastName || ''}`.trim()
                        : 'Unknown User';
                      return (
                        <option key={memberId} value={memberId}>
                          {displayName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={editingTask.dueDate}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditTaskModalOpen(false);
                    setEditingTask(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Update Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📄 Task Document View Modal */}
      {viewingTask && (
        <div className="modal" onClick={() => setViewingTask(null)}>
          <div className="task-viewer" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="viewer-header">
              <div className="task-title-section">
                <h1 className="task-title">{viewingTask.title}</h1>
                <div className="task-badges">
                  <span className={`priority-badge priority-${viewingTask.priority}`}>
                    {viewingTask.priority?.toUpperCase()}
                  </span>
                  <span className={`status-badge status-${viewingTask.status || 'pending'}`}>
                    {viewingTask.status?.replace('_', ' ') || 'Pending'}
                  </span>
                </div>
              </div>
              <button
                className="close-btn modern-close"
                onClick={() => setViewingTask(null)}
                aria-label="Close task viewer"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Meta Info */}
            <div className="viewer-meta">
              <div className="meta-item">
                <div className="meta-icon">👤</div>
                <div>
                  <div className="meta-label">Assigned To</div>
                  <span className="meta-value">
                    {viewingTask.assignedTo?.firstName
                      ? `${viewingTask.assignedTo.firstName} ${viewingTask.assignedTo.lastName || ""}`.trim()
                      : viewingTask.assignedTo || "Unassigned"}
                  </span>
                </div>
              </div>

              {viewingTask.dueDate && (
                <div className="meta-item">
                  <div className="meta-icon">📅</div>
                  <div>
                    <div className="meta-label">Due Date</div>
                    <span className="meta-value">
                      {new Date(viewingTask.dueDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              )}

              {viewingTask.createdBy && (
                <div className="meta-item">
                  <div className="meta-icon">🧑‍💻</div>
                  <div>
                    <div className="meta-label">Created By</div>
                    <span className="meta-value">
                      {viewingTask.createdBy?.firstName || 'Unknown'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="viewer-divider"></div>

            {/* Description */}
            <div className="viewer-section">
              <h3 className="section-title">
                <span>📝</span> Description
              </h3>
              <div className="description-content">
                {viewingTask.description ? (
                  <p>{viewingTask.description}</p>
                ) : (
                  <div className="empty-state">
                    <span>No description provided</span>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments */}
            {viewingTask.attachments?.length > 0 && (
              <div className="viewer-section">
                <h3 className="section-title">
                  <span>📎</span> Attachments
                  <span className="section-count">({viewingTask.attachments.length})</span>
                </h3>
                <div className="attachments-grid">
                  {viewingTask.attachments.map((file, index) => (
                    <a
                      key={file._id || file.public_id || index}
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="attachment-card"
                      download={file.originalName || file.filename}
                    >
                      <div className="attachment-icon">
                        {file.mimeType?.startsWith('image/') ? '🖼️' :
                          file.mimeType === 'application/pdf' ? '📄' : '📁'}
                      </div>
                      <div className="attachment-info">
                        <div className="attachment-name">
                          {file.originalName || file.filename}
                        </div>
                        <div className="attachment-meta">
                          {(file.fileSize / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {viewingTask.progress !== undefined && (
              <div className="viewer-section">
                <div className="progress-section">
                  <div className="progress-label">
                    Progress: <span className="progress-percent">{viewingTask.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${viewingTask.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}






    </div>
  );
};


export default ProjectDetails;