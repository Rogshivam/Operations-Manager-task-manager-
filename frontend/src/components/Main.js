// App.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/TodoLogo.png';
import './Main.css';
import TaskForm from './TaskForm';
import Task from './Task';
import { colorCodes } from '../assets/colorCodes';
import { FiLogOut, FiGrid, FiUser } from 'react-icons/fi';
import DarkModeToggle from './DarkModeToggle';

const Main = ({ currentUser, onLogout }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tasks, setTasks] = useState(() => {
        const savedTasks = localStorage.getItem('tasks');
        return savedTasks ? JSON.parse(savedTasks) : [];
    });
    const [currentTask, setCurrentTask] = useState({ title: '', description: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [filter, setFilter] = useState('All');

    const toggleModal = () => {
        setIsModalOpen(!isModalOpen);
    };

    const getRandomColor = () => colorCodes[Math.floor(Math.random() * colorCodes.length)];

    useEffect(() => {
        try {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        } catch (error) {
            console.error('Failed to save tasks to local storage:', error);
        }
    }, [tasks]);

    const addTask = (task) => {
        if (currentUser) {
            setTasks([...tasks, { 
                ...task, 
                id: Date.now(), 
                completed: false, 
                date: Date.now(), 
                username: currentUser.username,
                userId: currentUser.id
            }]);
            setIsModalOpen(false);
        }
    };

    const updateTask = (task) => {
        setTasks(tasks.map(t => t.id === task.id ? task : t));
        setIsEditing(false);
        setIsModalOpen(false);
    };

    const deleteTask = (taskId) => {
        setTasks(tasks.filter(task => task.id !== taskId));
    };

    const markTaskCompleted = (taskId) => {
        setTasks(tasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task));
    };

    const filteredTasks = tasks.filter(task => {
        if (currentUser) {
            if (filter === 'Completed') {
                return task.completed && task.userId === currentUser.id;
            } else if (filter === 'Active') {
                return !task.completed && task.userId === currentUser.id;
            } else {
                return task.userId === currentUser.id;
            }
        }
        return false;
    });

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
                    <button onClick={() => setFilter('All')} className={filter === 'All' ? 'active' : ''}>
                        All Tasks
                    </button>
                    <button onClick={() => setFilter('Completed')} className={filter === 'Completed' ? 'active' : ''}>
                        Completed Tasks
                    </button>
                    <button onClick={() => setFilter('Active')} className={filter === 'Active' ? 'active' : ''}>
                        Active Tasks
                    </button>
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
