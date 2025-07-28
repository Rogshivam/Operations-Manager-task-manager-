import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiUsers, FiCalendar, FiUser, FiLogOut, FiEdit3, FiTrash2 } from 'react-icons/fi';
import DarkModeToggle from './DarkModeToggle';
import './ProjectDetails.css';
import logo from '../assets/TodoLogo.png';

const ProjectDetails = ({ currentUser, onLogout }) => {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        assignedTo: '',
        priority: 'medium',
        dueDate: ''
    });
    const [editProject, setEditProject] = useState({});

    useEffect(() => {
        loadProject();
    }, [projectId]);

    const loadProject = () => {
        const projects = JSON.parse(localStorage.getItem('projects')) || [];
        const foundProject = projects.find(p => p.id === parseInt(projectId));
        setProject(foundProject);
        if (foundProject) {
            setEditProject({
                name: foundProject.name,
                description: foundProject.description,
                startDate: foundProject.startDate,
                endDate: foundProject.endDate
            });
        }
    };

    const handleCreateTask = (e) => {
        e.preventDefault();
        
        const task = {
            id: Date.now(),
            ...newTask,
            status: 'pending',
            createdBy: currentUser.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const updatedProject = {
            ...project,
            tasks: [...project.tasks, task]
        };

        updateProject(updatedProject);
        setIsTaskModalOpen(false);
        setNewTask({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
    };

    const handleUpdateTask = (taskId, updates) => {
        const updatedTasks = project.tasks.map(task => 
            task.id === taskId ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task
        );

        const updatedProject = { ...project, tasks: updatedTasks };
        updateProject(updatedProject);
    };

    const handleDeleteTask = (taskId) => {
        const updatedTasks = project.tasks.filter(task => task.id !== taskId);
        const updatedProject = { ...project, tasks: updatedTasks };
        updateProject(updatedProject);
    };

    const handleUpdateProject = (e) => {
        e.preventDefault();
        
        const updatedProject = {
            ...project,
            ...editProject
        };

        updateProject(updatedProject);
        setIsEditModalOpen(false);
    };

    const updateProject = (updatedProject) => {
        const projects = JSON.parse(localStorage.getItem('projects')) || [];
        const updatedProjects = projects.map(p => 
            p.id === updatedProject.id ? updatedProject : p
        );
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
        setProject(updatedProject);
    };

    const getTaskStats = () => {
        const total = project?.tasks.length || 0;
        const completed = project?.tasks.filter(t => t.status === 'completed').length || 0;
        const pending = project?.tasks.filter(t => t.status === 'pending').length || 0;
        const inProgress = project?.tasks.filter(t => t.status === 'in_progress').length || 0;
        
        return { total, completed, pending, inProgress };
    };

    const canManageProject = () => {
        return currentUser.role === 'manager' && project?.managerId === currentUser.id;
    };

    const canAssignTasks = () => {
        return currentUser.role === 'team_lead' || canManageProject();
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

    if (!project) {
        return (
            <div className="project-details">
                <div className="loading">Loading project...</div>
            </div>
        );
    }

    const stats = getTaskStats();

    return (
        <div className="project-details">
            <header className="project-header">
                <div className="header-left">
                    <Link to="/dashboard" className="back-btn">
                        <FiArrowLeft />
                        Back to Dashboard
                    </Link>
                    <div className="project-info">
                        <h1>{project.name}</h1>
                        <p>{project.description}</p>
                    </div>
                </div>
                <div className="header-right">
                    <div className="user-info">
                        <FiUser />
                        <span>{currentUser.username} ({currentUser.role.replace('_', ' ')})</span>
                    </div>
                    <DarkModeToggle />
                    <button className="logout-btn" onClick={onLogout}>
                        <FiLogOut />
                        Logout
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
                                <span className="value">{project.startDate} - {project.endDate}</span>
                            </div>
                        </div>
                        <div className="meta-item">
                            <FiUsers />
                            <div>
                                <span className="label">Team Members</span>
                                <span className="value">{project.teamMembers.length}</span>
                            </div>
                        </div>
                        <div className="meta-item">
                            <FiUser />
                            <div>
                                <span className="label">Manager</span>
                                <span className="value">{project.managerName}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="tasks-section">
                    <div className="section-header">
                        <h2>Tasks</h2>
                        <div className="header-actions">
                            {canManageProject() && (
                                <button 
                                    className="edit-project-btn"
                                    onClick={() => setIsEditModalOpen(true)}
                                >
                                    <FiEdit3 />
                                    Edit Project
                                </button>
                            )}
                            {canAssignTasks() && (
                                <button 
                                    className="create-task-btn"
                                    onClick={() => setIsTaskModalOpen(true)}
                                >
                                    <FiPlus />
                                    Add Task
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="tasks-grid">
                        {project.tasks.map(task => (
                            <div key={task.id} className="task-card">
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
                                            {task.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                                <p className="task-description">{task.description}</p>
                                <div className="task-meta">
                                    <div className="meta-item">
                                        <span className="label">Assigned to:</span>
                                        <span className="value">{task.assignedTo || 'Unassigned'}</span>
                                    </div>
                                    {task.dueDate && (
                                        <div className="meta-item">
                                            <span className="label">Due:</span>
                                            <span className="value">{task.dueDate}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="task-actions">
                                    {task.assignedTo === currentUser.username && (
                                        <select
                                            value={task.status}
                                            onChange={(e) => handleUpdateTask(task.id, { status: e.target.value })}
                                            className="status-select"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    )}
                                    {canAssignTasks() && (
                                        <button 
                                            className="delete-btn"
                                            onClick={() => handleDeleteTask(task.id)}
                                        >
                                            <FiTrash2 />
                                        </button>
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

            {/* Create Task Modal */}
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
                                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Assign To</label>
                                    <select
                                        value={newTask.assignedTo}
                                        onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
                                        required
                                    >
                                        <option value="">Select Team Member</option>
                                        {project.teamMembers.map(member => (
                                            <option key={member.id} value={member.username}>
                                                {member.username}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Priority</label>
                                    <select
                                        value={newTask.priority}
                                        onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
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
                                    onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
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

            {/* Edit Project Modal */}
            {isEditModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Edit Project</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setIsEditModalOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleUpdateProject}>
                            <div className="form-group">
                                <label>Project Name</label>
                                <input
                                    type="text"
                                    value={editProject.name}
                                    onChange={(e) => setEditProject({...editProject, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={editProject.description}
                                    onChange={(e) => setEditProject({...editProject, description: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Date</label>
                                    <input
                                        type="date"
                                        value={editProject.startDate}
                                        onChange={(e) => setEditProject({...editProject, startDate: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>End Date</label>
                                    <input
                                        type="date"
                                        value={editProject.endDate}
                                        onChange={(e) => setEditProject({...editProject, endDate: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setIsEditModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="primary">
                                    Update Project
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