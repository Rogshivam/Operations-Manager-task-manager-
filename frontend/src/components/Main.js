import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/TodoLogo.png';
import './Main.css';
import TaskForm from './TaskForm';
import Task from './Task';
import { colorCodes } from '../assets/colorCodes';
import { FiLogOut, FiGrid, FiUser } from 'react-icons/fi';
import DarkModeToggle from './DarkModeToggle';
import { tasksAPI } from '../services/api';

const Main = ({ currentUser, onLogout }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState({ title: '', description: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const getRandomColor = () => colorCodes[Math.floor(Math.random() * colorCodes.length)];

  // 🔹 Fetch tasks from backend on mount
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    tasksAPI.getAll()
      .then(res => {
        const list = res.data?.tasks || [];
        const normalized = list.map(t => ({
          id: t.id || t._id,
          title: t.title,
          description: t.description,
          completed: t.status === 'completed',
          raw: t
        }));
        setTasks(normalized);
      })
      .catch(err => console.error('Failed to fetch tasks:', err))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const addTask = async (task) => {
    try {
      // Backend requires project/task structure; this simple personal task creator may not be supported.
      // Keep UI flow but avoid calling unsupported endpoint.
      console.warn('addTask is not supported without project/assignee context');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const updateTask = async (task) => {
    try {
      if (!task?.raw?._id) return;
      // Toggle completed maps to status field on backend
      const payload = { ...task.raw, status: task.completed ? 'pending' : 'completed' };
      const res = await tasksAPI.update(task.raw._id, payload);
      const updated = res.data?.task;
      const normalized = {
        id: updated.id || updated._id,
        title: updated.title,
        description: updated.description,
        completed: updated.status === 'completed',
        raw: updated
      };
      setTasks(tasks.map(t => t.id === normalized.id ? normalized : t));
      setIsEditing(false);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      // Only possible if we have raw mongo id
      const target = tasks.find(t => t.id === taskId);
      if (target?.raw?._id) {
        await tasksAPI.delete(target.raw._id);
      }
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const markTaskCompleted = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    try {
      const payload = { ...task.raw, status: task.completed ? 'pending' : 'completed' };
      if (!task?.raw?._id) return;
      const res = await tasksAPI.update(task.raw._id, payload);
      const updated = res.data?.task;
      const normalized = {
        id: updated.id || updated._id,
        title: updated.title,
        description: updated.description,
        completed: updated.status === 'completed',
        raw: updated
      };
      setTasks(tasks.map(t => (t.id === normalized.id ? normalized : t)));
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'Completed') return task.completed;
    if (filter === 'Active') return !task.completed;
    return true;
  });

  if (loading) return <div>Loading tasks...</div>;

  return (
    <div className="main">
      <header className="main-header">
        <div className="header-left">
          <img src={logo} className="logo" alt="Todo Logo" />
          <h1>Personal Tasks</h1>
        </div>
        <div className="header-right">
          <Link to="/dashboard" className="dashboard-btn">
            <FiGrid />
            Dashboard
          </Link>
          <div className="user-info">
            <FiUser />
            <span>{currentUser?.username} ({currentUser?.role?.replace('_', ' ')})</span>
          </div>
          <DarkModeToggle />
          <button className="logoutBtn" onClick={onLogout}>
            <FiLogOut />
            Logout
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="filter-buttons">
          <button onClick={() => setFilter('All')} className={filter === 'All' ? 'active' : ''}>All Tasks</button>
          <button onClick={() => setFilter('Completed')} className={filter === 'Completed' ? 'active' : ''}>Completed</button>
          <button onClick={() => setFilter('Active')} className={filter === 'Active' ? 'active' : ''}>Active</button>
        </div>

        <div className='taskItems'>
          {filteredTasks.map(task => (
            <Task
              key={task.id}
              task={task}
              setCurrentTask={setCurrentTask}
              setIsEditing={setIsEditing}
              deleteTask={deleteTask}
              markTaskCompleted={markTaskCompleted}
              setIsModalOpen={setIsModalOpen}
              color={getRandomColor()}
            />
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="empty-state">
            <h3>No tasks found</h3>
            <p>Get started by creating your first personal task.</p>
          </div>
        )}

        <button className="addTaskBtn" onClick={toggleModal}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <button className="closeTaskBtn" onClick={toggleModal}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={logo} className="logo1" alt="Todo Logo" />
            <TaskForm
              addTask={addTask}
              updateTask={updateTask}
              currentTask={currentTask}
              setCurrentTask={setCurrentTask}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              setIsModalOpen={setIsModalOpen}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Main;
