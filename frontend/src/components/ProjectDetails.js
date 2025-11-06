// ProjectDetails.js
import React, { useState, useEffect } from "react";
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
} from "react-icons/fi";
import DarkModeToggle from "./DarkModeToggle";
import "./ProjectDetails.css";
import FileUpload from "./FileUpload";
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

  // Task / project editing state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
  });
  const [taskFiles, setTaskFiles] = useState([]);

  const [editProject, setEditProject] = useState({});
  const [editTask, setEditTask] = useState(null);
  const [editTaskFiles, setEditTaskFiles] = useState([]);

  // ✅ Load project + tasks from backend
  useEffect(() => {
    if (projectId) loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await projectsAPI.getById(projectId, {
        credentials: "include",
      });
      const proj = normalizeProject(res.data?.project || res.data || res);

      // If backend doesn’t return tasks inside project, fetch separately
      if (!proj.tasks || proj.tasks.length === 0) {
        try {
          const tasksRes = await tasksAPI.getAll(
            { projectId },
            { credentials: "include" }
          );
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
  };

  // ✅ Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("You must be logged in.");

    try {
      const payload = {
        ...newTask,
        projectId: project.id,
        createdBy: currentUser.id || currentUser._id,
      };

      const res = await tasksAPI.create(payload, { credentials: "include" });
      const createdTask = res?.data?.task || res?.data;

      if (taskFiles.length > 0 && createdTask?._id) {
        const formData = new FormData();
        taskFiles.forEach((f) => formData.append("files", f));
        await tasksAPI.uploadAttachments(createdTask._id, formData, {
          credentials: "include",
        });
      }

      setIsTaskModalOpen(false);
      setNewTask({
        title: "",
        description: "",
        assignedTo: "",
        priority: "medium",
        dueDate: "",
      });
      setTaskFiles([]);
      await loadProject();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to create task");
    }
  };

  // ✅ Update Task
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editTask) return;

    try {
      await tasksAPI.update(editTask.id || editTask._id, editTask, {
        credentials: "include",
      });

      if (editTaskFiles.length > 0) {
        const formData = new FormData();
        editTaskFiles.forEach((f) => formData.append("files", f));
        await tasksAPI.uploadAttachments(editTask.id || editTask._id, formData, {
          credentials: "include",
        });
      }

      setEditTask(null);
      setEditTaskFiles([]);
      await loadProject();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update task");
    }
  };

  // ✅ Delete Task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await tasksAPI.delete(taskId, { credentials: "include" });
      setProject((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== taskId && t._id !== taskId),
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to delete task");
      await loadProject();
    }
  };

  // ✅ Update Project
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      const res = await projectsAPI.update(project.id, editProject, {
        credentials: "include",
      });
      setProject(normalizeProject(res?.data?.project || res?.data));
      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update project");
    }
  };

  // ✅ Quick status update
  const updateTaskField = async (taskId, patch) => {
    try {
      const res = await tasksAPI.update(taskId, patch, { credentials: "include" });
      const updated = res?.data?.task || res?.data;
      setProject((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === updated.id || t._id === updated._id ? { ...t, ...updated } : t
        ),
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to update task");
      await loadProject();
    }
  };

  // Helpers
  const getTaskStats = () => {
    const total = project?.tasks?.length || 0;
    const completed = project.tasks.filter((t) => t.status === "completed").length;
    const pending = project.tasks.filter((t) => t.status === "pending").length;
    const inProgress = project.tasks.filter((t) => t.status === "in_progress").length;
    return { total, completed, pending, inProgress };
  };

  const canManageProject = () =>
    currentUser?.role === "manager" && project?.managerId === currentUser?.id;

  const canAssignTasks = () =>
    currentUser &&
    (currentUser.role === "team_lead" || canManageProject());

  const getPriorityColor = (priority) =>
    priority === "high" ? "#ff4757" : priority === "low" ? "#2ed573" : "#ffa502";

  const getStatusColor = (status) =>
    status === "completed"
      ? "#2ed573"
      : status === "in_progress"
      ? "#3742fa"
      : "#ffa502";

  // Render states
  if (loading) return <div className="loading">Loading project...</div>;
  if (error) return <div className="loading">Error: {error}</div>;
  if (!project) return <div className="loading">Project not found</div>;

  const stats = getTaskStats();

  return (
    <div className="project-details">
      {/* Header */}
      <header className="project-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn">
            <FiArrowLeft /> Back
          </Link>
          <div className="project-info">
            <h1>{project.name}</h1>
            <p>{project.description}</p>
          </div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <FiUser />{" "}
            <span>
              {currentUser?.username} ({currentUser?.role})
            </span>
          </div>
          <DarkModeToggle />
          <button className="logout-btn" onClick={onLogout}>
            <FiLogOut /> Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="project-content">
        {/* Stats */}
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

        {/* Tasks Section */}
        <div className="tasks-section">
          <div className="section-header">
            <h2>Tasks</h2>
            <div className="header-actions">
              {canManageProject() && (
                <button onClick={() => setIsEditModalOpen(true)}>
                  <FiEdit3 /> Edit Project
                </button>
              )}
              {canAssignTasks() && (
                <button onClick={() => setIsTaskModalOpen(true)}>
                  <FiPlus /> Add Task
                </button>
              )}
            </div>
          </div>

          <div className="tasks-grid">
            {project.tasks.map((task) => (
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
                      {task.status}
                    </span>
                  </div>
                </div>
                <p>{task.description}</p>

                <div className="task-actions">
                  {task.assignedTo === currentUser?.username && (
                    <select
                      value={task.status}
                      onChange={(e) =>
                        updateTaskField(task.id, { status: e.target.value })
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  )}

                  {canAssignTasks() && (
                    <>
                      <button onClick={() => setEditTask(task)}>
                        <FiEdit3 />
                      </button>
                      <button onClick={() => handleDeleteTask(task.id)}>
                        <FiTrash2 />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isTaskModalOpen && (
        <TaskModal
          newTask={newTask}
          setNewTask={setNewTask}
          setTaskFiles={setTaskFiles}
          onClose={() => setIsTaskModalOpen(false)}
          onSubmit={handleCreateTask}
          members={project.teamMembers}
        />
      )}

      {isEditModalOpen && (
        <EditProjectModal
          editProject={editProject}
          setEditProject={setEditProject}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateProject}
        />
      )}

      {editTask && (
        <EditTaskModal
          editTask={editTask}
          setEditTask={setEditTask}
          setEditTaskFiles={setEditTaskFiles}
          onClose={() => setEditTask(null)}
          onSubmit={handleUpdateTask}
          members={project.teamMembers}
        />
      )}
    </div>
  );
};

export default ProjectDetails;
