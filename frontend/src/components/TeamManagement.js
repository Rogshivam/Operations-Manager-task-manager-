// TeamManagement.js
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiPlus,
  FiUsers,
  FiUser,
  FiLogOut,
  FiAward,
  FiTrash2
} from "react-icons/fi";
import DarkModeToggle from "./DarkModeToggle";
import "./TeamManagement.css";
import logo from "../assets/TodoLogo.png";
import { projectsAPI, usersAPI } from "../services/api";


const TeamManagement = ({ currentUser, onLogout }) => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  // . Load project + users on mount
  useEffect(() => {
    if (projectId) {
      loadProject();
      loadAllUsers();
    }
  }, [projectId]);
  const normalizeProject = (p) => ({
    ...p,
    id: p.id || p._id || p.projectId,
    tasks: (p.tasks || []).map((t) => ({ ...t, id: t.id || t._id })),
    teamMembers: p.teamMembers || [],
  });

  const loadProject = async () => {
    setLoading(true);
    try {
      const res = await projectsAPI.getById(projectId, { credentials: "include" });
      const loadedProject = normalizeProject(res.data?.project || res.data);
      setProject(loadedProject);
    } catch (err) {
      console.error("Error loading project:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const res = await usersAPI.getAll({ credentials: "include" });
      setAllUsers(res.data?.users || res.data || []);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  // . Add team member (API)
  // . UPDATED TeamManagement.js - Replace these 4 functions:

  // Add team member (direct update instead of missing endpoint)
  // . FIXED - Send required role field
  const handleAddTeamMember = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const res = await projectsAPI.addTeamMember(projectId, {
        userId: selectedUser,
        role: 'team_member'  // . REQUIRED by backend validation
      }, { credentials: "include" });

      setProject(normalizeProject(res.data?.project || res.data));
      setIsAddMemberModalOpen(false);
      setSelectedUser("");
      setSearchTerm("");
    } catch (err) {
      console.error("Error adding member:", err);
      alert(err.response?.data?.message || err.message || "Failed to add member");
    }
  };


  // Remove team member (direct update)
  const handleRemoveTeamMember = async (memberId) => {
    if (!window.confirm("Remove this team member?")) return;

    try {
      const updatedTeamMembers = (project.teamMembers || []).filter(
        member => (member.id || member._id) !== memberId
      );

      // Clear team lead if removing the lead
      let updateData = { teamMembers: updatedTeamMembers };
      if (project.teamLead?.id === memberId || project.teamLead === memberId) {
        updateData.teamLead = null;
      }

      const res = await projectsAPI.update(projectId, updateData, { credentials: "include" });
      setProject(normalizeProject(res.data?.project || res.data));
    } catch (err) {
      console.error("Error removing member:", err);
      alert("Failed to remove member");
    }
  };

  // Assign team lead (direct update)
 // . FIXED - Send ObjectId string (matches backend expectation)
const handleAssignTeamLead = async (memberId) => {
  try {
    const member = (project.teamMembers || []).find(m =>
      (m.id || m._id) === memberId
    );
    if (!member) return alert("Member not found");

    // . Send JUST the user ObjectId (backend expects this)
    const userId = member.user?._id || memberId;
    
    // console.log('Assigning team lead:', { memberId, userId }); 

    const res = await projectsAPI.update(projectId, {
      teamLead: userId  // . ObjectId string only
    }, { credentials: "include" });
    
    setProject(normalizeProject(res.data?.project || res.data));
  } catch (err) {
    console.error("Error assigning lead:", err);
    alert(err.response?.data?.message || "Team lead already assigned");
  }
};


  // Remove team lead (direct update)
  const handleRemoveTeamLead = async () => {
    if (!window.confirm("Remove current team lead?")) return;

    try {
      const res = await projectsAPI.update(projectId, {
        teamLead: null
      }, { credentials: "include" });
      setProject(normalizeProject(res.data?.project || res.data));
    } catch (err) {
      console.error("Error removing lead:", err);
      alert("Failed to remove team lead");
    }
  };


  // . Permission check (safe version)
  const canManageTeam = () => {
    const userId = currentUser?.id || currentUser?._id;
    const managerId =  project?.managerId || project?.manager?._id;
    return currentUser?.role === "manager" && managerId === userId;
  };
// const canManageTeam = () => {
//         return currentUser.role === 'manager' && project?.managerId === currentUser.id;
//     };
  // . Get available users (not already in team + search filter)
  const getAvailableUsers = () => {
    const currentMemberIds = (project?.teamMembers || []).map(member =>
      member.id || member._id || member.user?._id
    );
    return allUsers.filter(user => {
      const userId = user.id || user._id;
      return !currentMemberIds.includes(userId) &&
        user.username?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  const isTeamLead = (memberId) => {
    const leadId = project?.teamLead?.id || project?.teamLead?._id || project?.teamLead;
    return leadId === (memberId || memberId._id);
  };

  if (loading) return <div className="loading">Loading team...</div>;
  if (!project) return <div className="loading">Project not found</div>;
  if (!canManageTeam()) return <div>Access denied. Managers only.</div>;

  const availableUsers = getAvailableUsers();
// console.log("project:", project);
  return (
    <div className="team-management">
      {/* Header - SAME as localStorage version */}
      <header className="team-header">
        <div className="header-left">
          <Link to={`/dashboard/${projectId}`} className="back-btn">
            <FiArrowLeft /> Back to Project
          </Link>
          <div className="project-info">
            <h1>Team Management</h1>
            <p>{project.name}</p>
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

      <div className="team-content">
        {/* Stats Cards - SAME */}
        <div className="team-overview">
          <div className="overview-stats">
            <div className="stat-card">
              <FiUsers />
              <div>
                <h3>{(project.teamMembers || []).length}</h3>
                <p>Team Members</p>
              </div>
            </div>
            <div className="stat-card">
              <FiAward />
              <div>
                <h2>{project.name}</h2>
                <h3>{project.teamLead ? 1 : 0}</h3>
                <p>Team Lead</p>
              </div>
            </div>
          </div>

          {/* Manager Info - SAME */}
          <div className="manager-info">
            <div className="info-card">
              <h3>Project Manager</h3>
              <div className="member-item manager">
                <div className="member-avatar">
                  <FiUser />
                </div>
                <div className="member-details">
                  <h4>{project.manager.firstName}</h4>
                  <span className="role">Manager</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section - SAME layout */}
        <div className="team-section">
          <div className="section-header">
            <h2>Team Members</h2>
            {canManageTeam() && (
              <button
                className="add-member-btn"
                onClick={() => setIsAddMemberModalOpen(true)}
              >
                <FiPlus /> Add Member
              </button>
            )}
          </div>

          {/* Team Lead Section */}
          {project.teamLead && (
            <div className="team-lead-section">
              <h3>Team Lead</h3>
              <div className="member-card lead">
                <div className="member-avatar">
                  <FiAward />
                </div>
                <div className="member-details">
                  <h4>{project.teamLead.username || project.teamLead.firstName}</h4>
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

          {/* Team Members Grid */}
          <div className="members-section">
            <h3>Team Members</h3>
            <div className="members-grid">
              {(project.teamMembers || []).map((member) => {
                // . member.id works perfectly for your data
                const memberId = member.id || member._id;

                // . Perfect name extraction for your structure
                const displayName = `${member.user.firstName} ${member.user.lastName}`.trim() ||
                  member.user.username || 'Unknown User';

                return (
                  <div key={memberId} className="member-card">
                    <div className="member-avatar">
                      <FiUser />
                    </div>
                    <div className="member-details">
                      <h4>{displayName}</h4>
                      <span className="role">
                        {member.role?.replace('_', ' ') || 'Team Member'}
                      </span>
                      <span className="email">{member.user.email}</span>
                    </div>
                    <div className="member-actions">
                      {/* . "Make Lead" logic */}
                      {canManageTeam() && !isTeamLead(memberId) && !project.teamLead && (
                        <button
                          className="assign-lead-btn"
                          onClick={() => handleAssignTeamLead(memberId)}
                        >
                          <FiAward /> Make Lead
                        </button>
                      )}
                      {canManageTeam() && (
                        <button
                          className="remove-member-btn"
                          onClick={() => handleRemoveTeamMember(memberId)}
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {(project.teamMembers || []).length === 0 && (
              <div className="empty-state">
                <FiUsers size={48} />
                <h3>No team members yet</h3>
                <p>Add team members to get started with collaboration.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Member Modal - SAME as localStorage */}
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
                  {availableUsers.map((user) => {
                    const userId = user.id || user._id;
                    const displayName = user.username ||
                      `${user.firstName || ''} ${user.lastName || ''}`.trim();
                    return (
                      <option key={userId} value={userId}>
                        {displayName} ({user.role?.replace('_', ' ')})
                      </option>
                    );
                  })}
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
