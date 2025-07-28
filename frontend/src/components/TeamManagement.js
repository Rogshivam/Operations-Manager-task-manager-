import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiUsers, FiUser, FiLogOut, FiAward, FiTrash2 } from 'react-icons/fi';
import DarkModeToggle from './DarkModeToggle';
import './TeamManagement.css';
import logo from '../assets/TodoLogo.png';

const TeamManagement = ({ currentUser, onLogout }) => {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadProject();
        loadAllUsers();
    }, [projectId]);

    const loadProject = () => {
        const projects = JSON.parse(localStorage.getItem('projects')) || [];
        const foundProject = projects.find(p => p.id === parseInt(projectId));
        setProject(foundProject);
    };

    const loadAllUsers = () => {
        const users = JSON.parse(localStorage.getItem('allusers')) || [];
        setAllUsers(users);
    };

    const handleAddTeamMember = (e) => {
        e.preventDefault();
        
        if (!selectedUser) return;

        const userToAdd = allUsers.find(user => user.id === parseInt(selectedUser));
        if (!userToAdd) return;

        const updatedProject = {
            ...project,
            teamMembers: [...project.teamMembers, userToAdd]
        };

        updateProject(updatedProject);
        setIsAddMemberModalOpen(false);
        setSelectedUser('');
    };

    const handleRemoveTeamMember = (memberId) => {
        const updatedProject = {
            ...project,
            teamMembers: project.teamMembers.filter(member => member.id !== memberId)
        };

        // If the removed member was the team lead, clear the team lead
        if (project.teamLead?.id === memberId) {
            updatedProject.teamLead = null;
        }

        updateProject(updatedProject);
    };

    const handleAssignTeamLead = (memberId) => {
        const member = project.teamMembers.find(m => m.id === memberId);
        if (!member) return;

        const updatedProject = {
            ...project,
            teamLead: member
        };

        updateProject(updatedProject);
    };

    const handleRemoveTeamLead = () => {
        const updatedProject = {
            ...project,
            teamLead: null
        };

        updateProject(updatedProject);
    };

    const updateProject = (updatedProject) => {
        const projects = JSON.parse(localStorage.getItem('projects')) || [];
        const updatedProjects = projects.map(p => 
            p.id === updatedProject.id ? updatedProject : p
        );
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
        setProject(updatedProject);
    };

    const canManageTeam = () => {
        return currentUser.role === 'manager' && project?.managerId === currentUser.id;
    };

    const getAvailableUsers = () => {
        const currentMemberIds = project?.teamMembers.map(member => member.id) || [];
        return allUsers.filter(user => 
            !currentMemberIds.includes(user.id) && 
            user.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const isTeamLead = (memberId) => {
        return project?.teamLead?.id === memberId;
    };

    if (!project) {
        return (
            <div className="team-management">
                <div className="loading">Loading project...</div>
            </div>
        );
    }

    const availableUsers = getAvailableUsers();

    return (
        <div className="team-management">
            <header className="team-header">
                <div className="header-left">
                    <Link to={`/project/${projectId}`} className="back-btn">
                        <FiArrowLeft />
                        Back to Project
                    </Link>
                    <div className="project-info">
                        <h1>Team Management</h1>
                        <p>{project.name}</p>
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

            <div className="team-content">
                <div className="team-overview">
                    <div className="overview-stats">
                        <div className="stat-card">
                            <FiUsers />
                            <div>
                                <h3>{project.teamMembers.length}</h3>
                                <p>Team Members</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <FiAward />
                            <div>
                                <h3>{project.teamLead ? 1 : 0}</h3>
                                <p>Team Lead</p>
                            </div>
                        </div>
                    </div>

                    <div className="manager-info">
                        <div className="info-card">
                            <h3>Project Manager</h3>
                            <div className="member-item manager">
                                <div className="member-avatar">
                                    <FiUser />
                                </div>
                                <div className="member-details">
                                    <h4>{project.managerName}</h4>
                                    <span className="role">Manager</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="team-section">
                    <div className="section-header">
                        <h2>Team Members</h2>
                        {canManageTeam() && (
                            <button 
                                className="add-member-btn"
                                onClick={() => setIsAddMemberModalOpen(true)}
                            >
                                <FiPlus />
                                Add Member
                            </button>
                        )}
                    </div>

                    <div className="team-members">
                        {project.teamLead && (
                            <div className="team-lead-section">
                                <h3>Team Lead</h3>
                                <div className="member-card lead">
                                                                    <div className="member-avatar">
                                    <FiAward />
                                </div>
                                    <div className="member-details">
                                        <h4>{project.teamLead.username}</h4>
                                        <span className="role">Team Lead</span>
                                        <span className="email">{project.teamLead.email}</span>
                                    </div>
                                    {canManageTeam() && (
                                        <button 
                                            className="remove-lead-btn"
                                            onClick={handleRemoveTeamLead}
                                        >
                                            Remove Lead
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="members-section">
                            <h3>Team Members</h3>
                            <div className="members-grid">
                                {project.teamMembers.map(member => (
                                    <div key={member.id} className="member-card">
                                        <div className="member-avatar">
                                            <FiUser />
                                        </div>
                                        <div className="member-details">
                                            <h4>{member.username}</h4>
                                            <span className="role">{member.role.replace('_', ' ')}</span>
                                            <span className="email">{member.email}</span>
                                        </div>
                                        <div className="member-actions">
                                            {canManageTeam() && !isTeamLead(member.id) && !project.teamLead && (
                                                                                            <button 
                                                className="assign-lead-btn"
                                                onClick={() => handleAssignTeamLead(member.id)}
                                            >
                                                <FiAward />
                                                Make Lead
                                            </button>
                                            )}
                                            {canManageTeam() && (
                                                <button 
                                                    className="remove-member-btn"
                                                    onClick={() => handleRemoveTeamMember(member.id)}
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {project.teamMembers.length === 0 && (
                                <div className="empty-state">
                                    <FiUsers size={48} />
                                    <h3>No team members yet</h3>
                                    <p>Add team members to get started with collaboration.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Member Modal */}
            {isAddMemberModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Add Team Member</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setIsAddMemberModalOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleAddTeamMember}>
                            <div className="form-group">
                                <label>Search Users</label>
                                <input
                                    type="text"
                                    placeholder="Search by username..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Select User</label>
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    required
                                >
                                    <option value="">Choose a user...</option>
                                    {availableUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.username} ({user.role.replace('_', ' ')})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {availableUsers.length === 0 && searchTerm && (
                                <div className="no-results">
                                    <p>No users found matching "{searchTerm}"</p>
                                </div>
                            )}
                            <div className="modal-actions">
                                <button type="button" onClick={() => setIsAddMemberModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="primary" disabled={!selectedUser}>
                                    Add Member
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamManagement; 