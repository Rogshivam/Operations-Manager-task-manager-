// // ProjectDetails.js - FULL BACKEND VERSION
// import React, { useState, useEffect } from "react";
// import { useParams, Link } from "react-router-dom";
// import {
//   FiArrowLeft,
//   FiPlus,
//   FiUsers,
//   FiCalendar,
//   FiUser,
//   FiLogOut,
//   FiEdit3,
//   FiTrash2
// } from "react-icons/fi";
// import DarkModeToggle from "./DarkModeToggle";
// import "./ProjectDetails.css";
// import { tasksAPI, projectsAPI } from "../services/api";

// const normalizeProject = (p) => ({
//   ...p,
//   id: p.id || p._id || p.projectId,
//   tasks: (p.tasks || []).map((t) => ({ ...t, id: t.id || t._id })),
//   teamMembers: p.teamMembers || [],
// });

// const ProjectDetails = ({ currentUser, onLogout }) => {
//   const { projectId } = useParams();
//   const [project, setProject] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Task/project editing state
//   const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
//   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
//   const [newTask, setNewTask] = useState({
//     title: '',
//     description: '',
//     assignedTo: '',
//     priority: 'medium',
//     dueDate: ''
//   });
//   const [editProject, setEditProject] = useState({});
//   // Task editing state
//   const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
//   const [editingTask, setEditingTask] = useState(null);

//   // . Load project + tasks from backend
//   useEffect(() => {
//     if (projectId) loadProject();
//   }, [projectId]);

//   const loadProject = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await projectsAPI.getById(projectId, { credentials: "include" });
//       const proj = normalizeProject(res.data?.project || res.data || res);

//       // Fetch tasks if not included in project
//       if (!proj.tasks || proj.tasks.length === 0) {
//         try {
//           const tasksRes = await tasksAPI.getAll({ projectId }, { credentials: "include" });
//           proj.tasks = (tasksRes?.data?.tasks || tasksRes?.data || []).map(
//             (t) => ({ ...t, id: t.id || t._id })
//           );
//         } catch {
//           // ignore
//         }
//       }

//       setProject(proj);
//       setEditProject({
//         name: proj.name || "",
//         description: proj.description || "",
//         startDate: proj.startDate || "",
//         endDate: proj.endDate || "",
//       });
//     } catch (err) {
//       console.error(err);
//       setError(err.message || "Failed to load project");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // . Backend API Calls (ALL localStorage functionality converted)

//   // Create Task (API)
//   // const handleCreateTask = async (e) => {
//   //   e.preventDefault();
//   //   if (!currentUser) return alert("You must be logged in.");

//   //   try {
//   //     const payload = {
//   //       ...newTask,
//   //       projectId: project.id,
//   //       status: 'pending', // Default status
//   //       createdBy: currentUser.id || currentUser._id,
//   //     };

//   //     const res = await tasksAPI.create(payload, { credentials: "include" });
//   //     await loadProject(); // Refresh project data
//   //     setIsTaskModalOpen(false);
//   //     setNewTask({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
//   //   } catch (err) {
//   //     console.error(err);
//   //     alert(err.response?.data?.message || "Failed to create task");
//   //   }
//   // };
//   const handleCreateTask = async (e) => {
//     e.preventDefault();
//     if (!currentUser) return alert("You must be logged in.");

//     try {
//       const payload = {
//         title: newTask.title,
//         description: newTask.description,
//         projectId: project.id,
//         assignedTo: newTask.assignedTo,
//         priority: newTask.priority,
//         dueDate: newTask.dueDate || undefined,
//         status: newTask.status || 'pending', // Default status
//         createdBy: currentUser.id || currentUser._id,
//       };



//       const res = await tasksAPI.create(payload, { credentials: "include" });
//       // console.log('. TASK CREATEd:', res.data); // DEBUG

//       await loadProject();
//       setIsTaskModalOpen(false);
//       setNewTask({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
//     } catch (err) {
//       console.error('❌ ERROR:', err.response?.data || err.message);
//       alert(err.response?.data?.message || "Failed to create task");
//     }
//   };


//   // Update Task (API) - Quick status update
//   const handleUpdateTask = async (taskId, updates) => {
//     try {
//       await tasksAPI.update(taskId, updates, { credentials: "include" });
//       await loadProject(); // Refresh
//     } catch (err) {
//       console.error(err);
//       alert("Failed to update task");
//     }
//   };

//   // Delete Task (API)
//   const handleDeleteTask = async (taskId) => {
//     if (!window.confirm("Delete this task?")) return;
//     try {
//       await tasksAPI.delete(taskId, { credentials: "include" });
//       await loadProject(); // Refresh
//     } catch (err) {
//       console.error(err);
//       alert("Failed to delete task");
//     }
//   };

//   // Update Project (API)
//   const handleUpdateProject = async (e) => {
//     e.preventDefault();
//     try {
//       const res = await projectsAPI.update(project.id, editProject, {
//         credentials: "include",
//       });
//       setProject(normalizeProject(res?.data?.project || res?.data));
//       setIsEditModalOpen(false);
//     } catch (err) {
//       console.error(err);
//       alert(err.response?.data?.message || "Failed to update project");
//     }
//   };

//   // . ALL Utility Functions (same as localStorage version)
//   const getTaskStats = () => {
//     const total = project?.tasks?.length || 0;
//     const completed = project?.tasks?.filter(t => t.status === 'completed').length || 0;
//     const pending = project?.tasks?.filter(t => t.status === 'pending').length || 0;
//     const inProgress = project?.tasks?.filter(t => t.status === 'in_progress').length || 0;
//     return { total, completed, pending, inProgress };
//   };

//   const canManageProject = () => {
//     return currentUser?.role === 'manager' &&
//       (project?.manager?._id === currentUser?.id ||
//         project?.managerId === currentUser?.id);
//   };

//   const canAssignTasks = () => {
//     return currentUser?.role === 'team_lead' || canManageProject();
//   };

//   const getPriorityColor = (priority) => {
//     switch (priority) {
//       case 'high': return '#ff4757';
//       case 'medium': return '#ffa502';
//       case 'low': return '#2ed573';
//       default: return '#ffa502';
//     }
//   };

//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'completed': return '#2ed573';
//       case 'in_progress': return '#3742fa';
//       case 'pending': return '#ffa502';
//       default: return '#ffa502';
//     }
//   };
//   // . Helper to get user display name
//   const getUserName = (user) => {
//     if (!user) return 'Unassigned';
//     if (typeof user === 'string') return user;
//     return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unassigned';
//   };

//   // . Open Edit Task Modal
//   const openEditTaskModal = (task) => {
//     setEditingTask({
//       id: task.id || task._id,
//       title: task.title,
//       description: task.description,
//       assignedTo: task.assignedTo?._id || task.assignedTo || '',
//       priority: task.priority || 'medium',
//       status: task.status || 'pending',
//       dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
//     });
//     setIsEditTaskModalOpen(true);
//   };

//   // . Update Task (Full Edit)
//   const handleUpdateTaskFull = async (e) => {
//     e.preventDefault();
//     if (!editingTask || !currentUser) return;

//     try {
//       const payload = {
//         title: editingTask.title,
//         description: editingTask.description,
//         assignedTo: editingTask.assignedTo,
//         priority: editingTask.priority,
//         status: editingTask.status,
//         dueDate: editingTask.dueDate || undefined,
//       };

//       await tasksAPI.update(editingTask.id, payload, { credentials: "include" });
//       await loadProject(); // Refresh
//       setIsEditTaskModalOpen(false);
//       setEditingTask(null);
//     } catch (err) {
//       console.error('❌ Update task error:', err);
//       alert(err.response?.data?.message || "Failed to update task");
//     }
//   };


//   // Render states
//   if (loading) return <div className="loading">Loading project...</div>;
//   if (error) return <div className="loading error">Error: {error}</div>;
//   if (!project) return <div className="loading">Project not found</div>;

//   const stats = getTaskStats();
//   // console.log("project detail:", project);


//   return (
//     <div className="project-details">
//       {/* . SAME PERFECT UI as localStorage version */}
//       <header className="project-header">
//         <div className="header-left">
//           <Link to={`/dashboard/${projectId}`} className="back-btn">
//             <FiArrowLeft /> Back to Dashboard
//           </Link>
//           <div className="project-info">
//             <h1>{project.name}</h1>
//             <p>{project.description}</p>
//           </div>
//         </div>
//         <div className="header-right">
//           <div className="user-info">
//             <FiUser />
//             <span>{currentUser?.username} ({currentUser?.role?.replace('_', ' ')})</span>
//           </div>
//           <DarkModeToggle />
//           <button className="logout-btn" onClick={onLogout}>
//             <FiLogOut /> Logout
//           </button>
//         </div>
//       </header>

//       <div className="project-content">
//         {/* . SAME Stats Cards */}
//         <div className="project-overview">
//           <div className="overview-stats">
//             <div className="stat-card">
//               <h3>{stats.total}</h3>
//               <p>Total Tasks</p>
//             </div>
//             <div className="stat-card completed">
//               <h3>{stats.completed}</h3>
//               <p>Completed</p>
//             </div>
//             <div className="stat-card in-progress">
//               <h3>{stats.inProgress}</h3>
//               <p>In Progress</p>
//             </div>
//             <div className="stat-card pending">
//               <h3>{stats.pending}</h3>
//               <p>Pending</p>
//             </div>
//           </div>

//           {/* . SAME Project Meta */}
//           <div className="project-meta">
//             <div className="meta-item">
//               <FiCalendar />
//               <div>
//                 <span className="label">Timeline</span>
//                 <span className="value">
//                   {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
//                 </span>
//               </div>
//             </div>
//             <div className="meta-item">
//               <FiUsers />
//               <div>
//                 <span className="label">Team Members</span>
//                 <span className="value">{(project.teamMembers || []).length}</span>
//               </div>
//             </div>
//             <div className="meta-item">
//               <FiUser />
//               <div>
//                 <span className="label">Manager</span>
//                 <span className="value">
//                   {project.managerName ||
//                     `${project.manager?.firstName || ''} ${project.manager?.lastName || ''}`.trim()}
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* . SAME Tasks Section */}
//         <div className="tasks-section">
//           <div className="section-header">
//             <h2>Tasks</h2>
//             <div className="header-actions">
//               {canManageProject() && (
//                 <button
//                   className="edit-project-btn"
//                   onClick={() => setIsEditModalOpen(true)}
//                 >
//                   <FiEdit3 /> Edit Project
//                 </button>
//               )}
//               {canAssignTasks() && (
//                 <button
//                   className="create-task-btn"
//                   onClick={() => setIsTaskModalOpen(true)}
//                 >
//                   <FiPlus /> Add Task
//                 </button>
//               )}
//             </div>
//           </div>

//           <div className="tasks-grid">
//             {project.tasks.map(task => (
//               <div key={task.id || task._id} className="task-card">
//                 <div className="task-header">
//                   <h3>{task.title}</h3>
//                   <div className="task-badges">
//                     <span
//                       className="priority-badge"
//                       style={{ backgroundColor: getPriorityColor(task.priority) }}
//                     >
//                       {task.priority}
//                     </span>
//                     <span
//                       className="status-badge"
//                       style={{ backgroundColor: getStatusColor(task.status) }}
//                     >
//                       {task.status?.replace('_', ' ')}
//                     </span>
//                   </div>
//                 </div>
//                 <p className="task-description">{task.description}</p>
//                 <div className="task-meta">
//                   <div className="meta-item">
//                     <span className="label">Assigned to:</span>

//                     <span className="value">
//                       {task.assignedTo?.firstName
//                         ? `${task.assignedTo.firstName} ${task.assignedTo.lastName || ''}`.trim() || 'Unassigned'
//                         : task.assignedTo || 'Unassigned'
//                       }
//                     </span>

//                   </div>
//                   {task.dueDate && (
//                     <div className="meta-item">
//                       <span className="label">Due:</span>
//                       <span className="value">{new Date(task.dueDate).toLocaleDateString()}</span>
//                     </div>
//                   )}
//                 </div>
//                 <div className="task-actions">
//                   {task.assignedTo?._id === currentUser?.id || task.assignedTo === currentUser?.id ? (
//                     <select
//                       value={task.status}
//                       onChange={(e) => handleUpdateTask(task.id || task._id, { status: e.target.value })}
//                       className="status-select"
//                     >
//                       <option value="pending">Pending</option>
//                       <option value="in_progress">In Progress</option>
//                       <option value="completed">Completed</option>
//                     </select>
//                   ) : null}

//                   {canAssignTasks() && (
//                     <>
//                       <button
//                         className="edit-btn"
//                         onClick={() => openEditTaskModal(task)}  
//                         title="Edit Task"
//                       >
//                         <FiEdit3 />
//                       </button>
//                       <button
//                         className="delete-btn"
//                         onClick={() => handleDeleteTask(task.id || task._id)}
//                       >
//                         <FiTrash2 />
//                       </button>
//                     </>
//                   )}

//                 </div>
//               </div>
//             ))}
//           </div>

//           {project.tasks.length === 0 && (
//             <div className="empty-state">
//               <FiPlus size={48} />
//               <h3>No tasks yet</h3>
//               <p>Get started by creating the first task for this project.</p>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* . Inline Modals (same as localStorage version) */}

//       {isTaskModalOpen && (
//         <div className="modal">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h2>Create New Task</h2>
//               <button
//                 className="close-btn"
//                 onClick={() => setIsTaskModalOpen(false)}
//               >
//                 ×
//               </button>
//             </div>
//             <form onSubmit={handleCreateTask}>
//               <div className="form-group">
//                 <label>Task Title</label>
//                 <input
//                   type="text"
//                   value={newTask.title}
//                   onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
//                   required
//                 />
//               </div>
//               <div className="form-group">
//                 <label>Description</label>
//                 <textarea
//                   value={newTask.description}
//                   onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
//                   required
//                 />
//               </div>
//               <div className="form-row">
//                 <div className="form-group">
//                   <label>Assign To</label>
//                   <select
//                     value={newTask.assignedTo}
//                     onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
//                     required
//                   >
//                     <option value="">Select Team Member</option>
//                     {(project.teamMembers || []).map(member => {
//                       // EXTRACT USER ObjectId from your data structure
//                       const memberId = member.user?._id || member.userId || member.id;
//                       const displayName = member.user?.firstName
//                         ? `${member.user.firstName} ${member.user.lastName || ''}`.trim()
//                         : 'Unknown User';

//                       return (
//                         <option key={memberId} value={memberId}> {/*SENDS ObjectId */}
//                           {displayName}
//                         </option>
//                       );
//                     })}
//                   </select>
//                 </div>
//                 <div className="form-group">
//                   <label>Priority</label>
//                   <select
//                     value={newTask.priority}
//                     onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
//                     required
//                   >
//                     <option value="low">Low</option>
//                     <option value="medium">Medium</option>
//                     <option value="high">High</option>
//                   </select>
//                 </div>
//               </div>
//               <div className="form-group">
//                 <label>Due Date</label>
//                 <input
//                   type="date"
//                   value={newTask.dueDate}
//                   onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
//                 />
//               </div>
//               <div className="modal-actions">
//                 <button type="button" onClick={() => setIsTaskModalOpen(false)}>
//                   Cancel
//                 </button>
//                 <button type="submit" className="primary">
//                   Create Task
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Edit Project Modal */}
//       {/* . Edit Task Modal */}
//       {isEditTaskModalOpen && editingTask && (
//         <div className="modal">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h2>Edit Task</h2>
//               <button
//                 className="close-btn"
//                 onClick={() => {
//                   setIsEditTaskModalOpen(false);
//                   setEditingTask(null);
//                 }}
//               >
//                 ×
//               </button>
//             </div>
//             <form onSubmit={handleUpdateTaskFull}>
//               <div className="form-group">
//                 <label>Task Title</label>
//                 <input
//                   type="text"
//                   value={editingTask.title}
//                   onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
//                   required
//                 />
//               </div>
//               <div className="form-group">
//                 <label>Description</label>
//                 <textarea
//                   value={editingTask.description}
//                   onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
//                   required
//                 />
//               </div>
//               <div className="form-row">
//                 <div className="form-group">
//                   <label>Assign To</label>
//                   <select
//                     value={editingTask.assignedTo}
//                     onChange={(e) => setEditingTask({ ...editingTask, assignedTo: e.target.value })}
//                     required
//                   >
//                     <option value="">Select Team Member</option>
//                     {(project.teamMembers || []).map(member => {
//                       const memberId = member.user?._id || member.userId || member.id;
//                       const displayName = member.user?.firstName
//                         ? `${member.user.firstName} ${member.user.lastName || ''}`.trim()
//                         : 'Unknown User';
//                       return (
//                         <option key={memberId} value={memberId}>
//                           {displayName}
//                         </option>
//                       );
//                     })}
//                   </select>
//                 </div>
//                 <div className="form-group">
//                   <label>Priority</label>
//                   <select
//                     value={editingTask.priority}
//                     onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
//                     required
//                   >
//                     <option value="low">Low</option>
//                     <option value="medium">Medium</option>
//                     <option value="high">High</option>
//                   </select>
//                 </div>
//               </div>
//               <div className="form-row">
//                 <div className="form-group">
//                   <label>Status</label>
//                   <select
//                     value={editingTask.status}
//                     onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
//                     required
//                   >
//                     <option value="pending">Pending</option>
//                     <option value="in_progress">In Progress</option>
//                     <option value="completed">Completed</option>
//                   </select>
//                 </div>
//                 <div className="form-group">
//                   <label>Due Date</label>
//                   <input
//                     type="date"
//                     value={editingTask.dueDate}
//                     onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
//                   />
//                 </div>
//               </div>
//               <div className="modal-actions">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setIsEditTaskModalOpen(false);
//                     setEditingTask(null);
//                   }}
//                 >
//                   Cancel
//                 </button>
//                 <button type="submit" className="primary">
//                   Update Task
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// };

// export default ProjectDetails;
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
  FiTrash2
} from "react-icons/fi";
import DarkModeToggle from "./DarkModeToggle";
import "./ProjectDetails.css";
import { tasksAPI, projectsAPI } from "../services/api";

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

  // Task/project editing state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: ''
  });
  const [editProject, setEditProject] = useState({});
  // Task editing state
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // . FIXED #2: useCallback + deps array
  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projectRes = await projectsAPI.getById(projectId, { credentials: "include" });
      const proj = normalizeProject(projectRes.data?.project || projectRes.data);

      // Fetch tasks if not included in project
      if (!proj.tasks || proj.tasks.length === 0) {
        try {
          const tasksRes = await tasksAPI.getAll({ projectId }, { credentials: "include" });
          proj.tasks = (tasksRes?.data?.tasks || tasksRes?.data || []).map(
            (t) => ({ ...t, id: t.id || t._id })
          );
        } catch {
          // ignore
        }
      }

      setProject(proj);
      setEditProject({
        name: proj.name || "",
        description: proj.description || "",
        startDate: proj.startDate || "",
        endDate: proj.endDate || "",
      });
    } catch (err) {
      console.error(err);
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
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("You must be logged in.");

    try {
      const payload = {
        title: newTask.title,
        description: newTask.description,
        projectId: project.id,
        assignedTo: newTask.assignedTo,
        priority: newTask.priority,
        dueDate: newTask.dueDate || undefined,
        status: newTask.status || 'pending',
        createdBy: currentUser.id || currentUser._id,
      };

      await tasksAPI.create(payload, { credentials: "include" });
      await loadProject();
      setIsTaskModalOpen(false);
      setNewTask({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
    } catch (err) {
      console.error('❌ ERROR:', err.response?.data || err.message);
      alert(err.response?.data?.message || "Failed to create task");
    }
  };

  // Update Task (API) - Quick status update
  const handleUpdateTask = async (taskId, updates) => {
    try {
      await tasksAPI.update(taskId, updates, { credentials: "include" });
      await loadProject();
    } catch (err) {
      console.error(err);
      alert("Failed to update task");
    }
  };

  // Delete Task (API)
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
   console.log("project detail:", project);

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
            {project.tasks.map(task => (
              <div key={task.id || task._id} className="task-card">
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
                        ? `${task.assignedTo.firstName} ${task.assignedTo.lastName || ''}`.trim() || 'Unassigned'
                        : task.assignedTo || 'Unassigned'}
                    </span>
                  </div>
                  {task.dueDate && (
                    <div className="meta-item">
                      <span className="label">Due:</span>
                      <span className="value">{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div className="task-actions">
                  {task.assignedTo?._id === currentUser?.id || task.assignedTo === currentUser?.id ? (
                    <select
                      value={task.status}
                      onChange={(e) => handleUpdateTask(task.id || task._id, { status: e.target.value })}
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
                        onClick={() => openEditTaskModal(task)}
                        title="Edit Task"
                      >
                        <FiEdit3 />
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteTask(task.id || task._id)}
                      >
                        <FiTrash2 />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
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

      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Task</h2>
              <button
                className="close-btn"
                onClick={() => setIsTaskModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Task Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  required
                />
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
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Task</h2>
              <button
                className="close-btn"
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
    </div>
  );
};

export default ProjectDetails;
