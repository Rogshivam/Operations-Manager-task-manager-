import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiUsers, FiFolder, FiLogOut, FiUser, FiEdit3, FiTrash2, FiX } from 'react-icons/fi';
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  });
  const [editingProject, setEditingProject] = useState({
    id: '',
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);



  // 1. Stats Functions
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


  // 2. Permission Functions
  const canManageProject = (project) => {
    const userId = currentUser?.id || currentUser?._id;
    const managerId = project.managerId || project.manager?._id;
    return currentUser?.role === 'manager' && managerId === userId;
  };


  const canEditProject = (project) => {
    const userId = currentUser?.id || currentUser?._id;
    const managerId = project.managerId || project.manager?._id;
    const teamLeadId = project.teamLead?._id || project.teamLead;
    return (currentUser?.role === 'manager' && managerId === userId) ||
      (currentUser?.role === 'teamlead' && teamLeadId === userId);
  };


  const canDeleteProject = (project) => {
    return currentUser?.role === 'manager';
  };

  const canViewProject = (project) => {
    const userId = currentUser?.id || currentUser?._id;
    return currentUser?.role === 'manager' ||
      (project.teamMembers || []).some(member =>
        (member.id || member._id || member.user?._id) === userId
      ) ||
      (project.teamLead?._id || project.teamLead) === userId;
  };
  // ✅ NEW: Long Press Handler (2s)
  const handleLongPress = useCallback((projectId) => {
    setSelectionMode(true);
    if (!selectedProjects.includes(projectId)) {
      setSelectedProjects([projectId]);
    }
  }, [selectedProjects]);

  const handleProjectPress = (projectId) => {
    if (!selectionMode) return;

    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };
  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedProjects.length === 0) return;

    try {
      await Promise.all(
        selectedProjects.map(id =>
          projectsAPI.delete(id, { credentials: "include" })
        )
      );

      setProjects(prev => prev.filter(p => !selectedProjects.includes(p.id)));
      clearSelection();
    } catch (err) {
      console.error(err);
      alert('Error deleting projects');
    }
  };

  const clearSelection = () => {
    setSelectedProjects([]);
    setSelectionMode(false);
  };

  // 3. API Functions
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


  //FULL EDIT FUNCTIONALITY (Name, Desc, Dates, Status)
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editingProject.id) return;
    try {
      const res = await projectsAPI.update(editingProject.id, editingProject, {
        credentials: "include"
      });
      const updated = res.data?.project || res.data;
      const tasksRes = await tasksAPI.getAll({
        projectId: updated._id,
        limit: 100
      }, { credentials: "include" });
      const normalized = normalizeProject({
        ...updated,
        tasks: tasksRes.data?.tasks || []
      });
      setProjects(prev => prev.map(p =>
        p.id === editingProject.id ? normalized : p
      ));
      setIsEditModalOpen(false);
      setEditingProject({ id: '', name: '', description: '', startDate: '', endDate: '', status: 'active' });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Error updating project');
    }
  };

  const openEditModal = (project) => {
    setEditingProject({
      id: project.id,
      name: project.name || '',
      description: project.description || '',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      status: project.status || 'active'
    });
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    if (!currentUser) return;
    loadProjects();
  }, [currentUser]);

  const filteredProjects = projects.filter(canViewProject);
  const overallStats = getOverallStats(filteredProjects);
  const selectedCount = selectedProjects.length;

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
  // console.log("project details:", projects);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <img src={logo} className="logo" alt="Todo Logo" />
          <h1>Project Dashboard</h1>
        </div>
        <div className="header-right">
          {selectionMode && (
            <div className="selection-header">
              <span>{selectedCount} selected</span>
              <button className="select-cancel" onClick={clearSelection}>
                <FiX /> Cancel
              </button>
              {selectedCount > 0 && currentUser.role === 'manager' && (
                <button className="select-delete" onClick={() => setIsDeleteConfirmOpen(true)}>
                  <FiTrash2 /> Delete
                </button>
              )}
            </div>
          )}
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
              <p>Task Completed</p>
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
            {currentUser.role === 'manager' && !selectionMode && (
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
              const isSelected = selectedProjects.includes(project.id);
              const canDelete = canDeleteProject(project);

              return (
                <div
                  key={project.id}
                  className={`project-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleProjectPress(project.id)}
                  onMouseDown={() => {
                    if (!selectionMode) {
                      const timer = setTimeout(() => handleLongPress(project.id), 2000);
                      setLongPressTimer(timer);
                    }
                  }}
                  onMouseUp={() => {
                    if (longPressTimer) {
                      clearTimeout(longPressTimer);
                      setLongPressTimer(null);
                    }
                  }}
                  onTouchStart={() => {
                    if (!selectionMode) {
                      const timer = setTimeout(() => handleLongPress(project.id), 2000);
                      setLongPressTimer(timer);
                    }
                  }}
                  onTouchEnd={() => {
                    if (longPressTimer) {
                      clearTimeout(longPressTimer);
                      setLongPressTimer(null);
                    }
                  }}
                >
                  {selectionMode && canDelete && (
                    <div className="selection-checkbox">
                      <span>{isSelected ? '✓' : ''}</span>
                    </div>
                  )}
                  <div className="project-header">
                    <div className="baba">
                    <h3>{project.name}</h3>
                    </div>
                    <span className={`status ${project.status}`}>{project.status}</span>
                    {canEditProject(project) && !selectionMode && (
                      <button
                        className="edit-project-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(project);
                        }}
                        title="Edit Project Details"
                      >
                        <FiEdit3 />
                      </button>
                    )}
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
                    {!selectionMode && (
                      <>
                        <Link to={`/project/${project.id}`} className="view-btn">
                          View Details
                        </Link>
                        {canManageProject(project) && (
                          <Link to={`/project/team/${project.id}`} className="team-btn">
                            Manage Team
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ✅ DELETE CONFIRMATION MODAL */}
      {isDeleteConfirmOpen && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Delete {selectedCount} Project{selectedCount > 1 ? 's' : ''}?</h2>
              <button className="close-btn" onClick={() => setIsDeleteConfirmOpen(false)}>
                ×
              </button>
            </div>
            <div className="delete-confirm-body">
              <p>This action cannot be undone. Are you sure?</p>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="danger primary"
                >
                  <FiTrash2 /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ FULL EDIT MODAL - IDENTICAL TO CREATE */}
      {isEditModalOpen && editingProject.id && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Project</h2>
              <button
                className="close-btn"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingProject({ id: '', name: '', description: '', startDate: '', endDate: '', status: 'active' });
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateProject}>
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editingProject.description}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  required
                  rows="4"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={editingProject.startDate}
                    onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={editingProject.endDate}
                    onChange={(e) => setEditingProject({ ...editingProject, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editingProject.status}
                  onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                  required
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingProject({ id: '', name: '', description: '', startDate: '', endDate: '', status: 'active' });
                }}>
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


      {/* Create Modal */}
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
                  rows="4"
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
