// ProjectDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiUsers, FiFolder, FiLogOut, FiUser } from 'react-icons/fi';
import DarkModeToggle from './DarkModeToggle';
import './ProjectDashboard.css';
import logo from '../assets/TodoLogo.png';
import { projectsAPI } from '../services/api';

const ProjectDashboard = ({ currentUser, onLogout }) => {
  const [projects, setProjects] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // load projects when currentUser changes
  useEffect(() => {
    if (!currentUser) return;
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await projectsAPI.getAll();
      const list = res.data?.projects || [];
      const normalized = list.map(p => ({ ...p, id: p.id || p._id }));
      setProjects(normalized);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert('You must be logged in to create a project.');

    const projectPayload = {
      name: newProject.name,
      description: newProject.description,
      startDate: newProject.startDate,
      endDate: newProject.endDate
    };

    try {
      const res = await projectsAPI.create(projectPayload);
      const created = res.data?.project;
      const normalized = { ...created, id: created.id || created._id };
      setProjects(prev => [...prev, normalized]);
      setIsCreateModalOpen(false);
      setNewProject({ name: '', description: '', startDate: '', endDate: '' });
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error creating project');
    }
  };

  const getProjectStats = (project) => {
    const totalTasks = (project.tasks || []).length;
    const completedTasks = (project.tasks || []).filter(task => task.status === 'completed').length;
    const pendingTasks = totalTasks - completedTasks;
    return { totalTasks, completedTasks, pendingTasks };
  };

  const canManageProject = (project) => {
    return currentUser?.role === 'manager' && project.managerId === currentUser.id;
  };

  const canViewProject = (project) => {
    return currentUser?.role === 'manager' ||
      (project.teamMembers || []).some(member => member?.id === currentUser?.id) ||
      project.teamLead?.id === currentUser?.id;
  };

  // show only projects the user can view
  const filteredProjects = projects.filter(project => canViewProject(project));

  if (!currentUser) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <div className="header-left">
            <img src={logo} className="logo" alt="Todo Logo" />
            <h1>Project Dashboard</h1>
          </div>
        </header>
        <div className="dashboard-content">
          <p>Please log in to see projects.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <img src={logo} className="logo" alt="Todo Logo" />
          <h1>Project Dashboard</h1>
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

      <div className="dashboard-content">
        <div className="dashboard-stats">
          <div className="stat-card">
            <FiFolder />
            <div>
              <h3>{filteredProjects.length}</h3>
              <p>Total Projects</p>
            </div>
          </div>
          <div className="stat-card">
            <FiUsers />
            <div>
              <h3>{filteredProjects.reduce((acc, project) => acc + ((project.teamMembers || []).length), 0)}</h3>
              <p>Team Members</p>
            </div>
          </div>
        </div>

        <div className="projects-section">
          <div className="section-header">
            <h2>My Projects</h2>
            {currentUser.role === 'manager' && (
              <button
                className="create-project-btn"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <FiPlus />
                Create Project
              </button>
            )}
          </div>

          {loading && <p>Loading projects...</p>}
          {error && <p className="error">{error}</p>}

          <div className="projects-grid">
            {filteredProjects.map(project => {
              const stats = getProjectStats(project);
              return (
                <div key={project.id} className="project-card">
                  <div className="project-header">
                    <h3>{project.name}</h3>
                    <span className={`status ${project.status}`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="project-description">{project.description}</p>
                  <div className="project-stats">
                    <div className="stat">
                      <span className="label">Tasks:</span>
                      <span className="value">{stats.totalTasks}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Completed:</span>
                      <span className="value completed">{stats.completedTasks}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Pending:</span>
                      <span className="value pending">{stats.pendingTasks}</span>
                    </div>
                  </div>
                  <div className="project-actions">
                    <Link to={`/project/${project.id}`} className="view-btn">
                      View Details
                    </Link>
                    {canManageProject(project) && (
                      <Link to={`/team/${project.id}`} className="team-btn">
                        Manage Team
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProjects.length === 0 && !loading && (
            <div className="empty-state">
              <FiFolder size={48} />
              <h3>No projects found</h3>
              <p>Get started by creating your first project or joining an existing one.</p>
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Project</h2>
              <button
                className="close-btn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDashboard;
