import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiUsers, FiFolder, FiLogOut, FiUser } from 'react-icons/fi';
import DarkModeToggle from './DarkModeToggle';
import './ProjectDashboard.css';
import logo from '../assets/TodoLogo.png';
import { projectsAPI, tasksAPI } from '../services/api';

const normalizeProject = (p) => ({
  ...p,
  id: p.id || p._id || p.projectId,
  tasks: (p.tasks || []).map((t) => ({ ...t, id: t.id || t._id })),
  teamMembers: p.teamMembers || [],
});

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

  // ✅ 1. ALL FUNCTIONS DEFINED FIRST (No hoisting errors!)
  const getSingleProjectStats = (project) => {
    const tasks = project.tasks || [];
    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      inProgressTasks: tasks.filter(t => t.status === 'in_progress').length
    };
  };

  const getOverallStats = (filteredProjects) => {
    const allTasks = filteredProjects.flatMap(p => p.tasks || []);
    return {
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
      pendingTasks: allTasks.filter(t => t.status === 'pending').length
    };
  };

  const canManageProject = (project) => {
    const userId = currentUser?.id || currentUser?._id;
    const managerId = project.managerId || project.manager?._id;
    return currentUser?.role === 'manager' && managerId === userId;
  };

  const canViewProject = (project) => {
    const userId = currentUser?.id || currentUser?._id;
    return currentUser?.role === 'manager' || 
           (project.teamMembers || []).some(member => 
             (member.id || member._id || member.user?._id) === userId
           ) ||
           (project.teamLead?._id || project.teamLead) === userId;
  };

  // ✅ 2. API Functions
  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await projectsAPI.getAll({ credentials: "include" });
      const projectsList = res.data?.projects || res.data || [];
      
      const projectsWithTasks = await Promise.all(
        projectsList.map(async (proj) => {
          try {
            const tasksRes = await tasksAPI.getAll({ 
              projectId: proj._id,
              limit: 100
            }, { credentials: "include" });
            
            return normalizeProject({
              ...proj,
              tasks: tasksRes.data?.tasks || []
            });
          } catch {
            return normalizeProject(proj);
          }
        })
      );
      
      setProjects(projectsWithTasks);
      // console.log("✅ Projects WITH TASKS:", projectsWithTasks);
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
      endDate: newProject.endDate,
      managerId: currentUser.id || currentUser._id,
      managerName: currentUser.username,
      teamMembers: [],
      status: 'active'
    };

    try {
      const res = await projectsAPI.create(projectPayload, { credentials: "include" });
      const created = res.data?.project || res.data;
      
      const tasksRes = await tasksAPI.getAll({ 
        projectId: created._id,
        limit: 100 
      }, { credentials: "include" });
      
      const normalized = normalizeProject({
        ...created,
        tasks: tasksRes.data?.tasks || []
      });
      
      setProjects(prev => [normalized, ...prev]);
      setIsCreateModalOpen(false);
      setNewProject({ name: '', description: '', startDate: '', endDate: '' });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Error creating project');
    }
  };

  // ✅ 3. useEffect (AFTER functions defined)
  useEffect(() => {
    if (!currentUser) return;
    loadProjects();
  }, [currentUser]);

  // ✅ 4. Derived state (SAFE now)
  const filteredProjects = projects.filter(canViewProject);
  const overallStats = getOverallStats(filteredProjects);

  // console.log('Projects loaded:', projects);

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
            <span>{currentUser.username} ({currentUser.role?.replace('_', ' ')})</span>
          </div>
          <DarkModeToggle />
          <button className="logout-btn" onClick={onLogout}>
            <FiLogOut /> Logout
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
              <h3>{filteredProjects.reduce((acc, p) => acc + (p.teamMembers?.length || 0), 0)}</h3>
              <p>Team Members</p>
            </div>
          </div>
          
          <div className="stat-card">
            <FiPlus />
            <div>
              <h3>{overallStats.totalTasks}</h3>
              <p>Total Tasks</p>
            </div>
          </div>
          <div className="stat-card completed">
            <div>
              <h3>{overallStats.completedTasks}</h3>
              <p>Completed</p>
            </div>
          </div>
          <div className="stat-card pending">
            <div>
              <h3>{overallStats.pendingTasks}</h3>
              <p>Pending</p>
            </div>
          </div>
        </div>

        <div className="projects-section">
          <div className="section-header">
            <h2>My Projects</h2>
            {currentUser.role === 'manager' && (
              <button className="create-project-btn" onClick={() => setIsCreateModalOpen(true)}>
                <FiPlus /> Create Project
              </button>
            )}
          </div>

          {loading && <p>Loading projects...</p>}
          {error && <p className="error">{error}</p>}

          <div className="projects-grid">
            {filteredProjects.map(project => {
              const stats = getSingleProjectStats(project);
              return (
                <div key={project.id} className="project-card">
                  <div className="project-header">
                    <h3>{project.name}</h3>
                    <span className={`status ${project.status}`}>{project.status}</span>
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
                      <Link to={`/project/team/${project.id}`} className="team-btn">
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
              <button className="close-btn" onClick={() => setIsCreateModalOpen(false)}>
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
