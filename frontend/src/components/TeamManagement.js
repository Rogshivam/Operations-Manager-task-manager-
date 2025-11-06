// TeamManagement.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { projectsAPI, usersAPI } from "../services/api";

const TeamManagement = ({ projectId: propProjectId }) => {
  const params = useParams();
  const projectId = propProjectId || params.projectId;
  const [project, setProject] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");

  // ✅ Load project details
  const loadProject = async () => {
    try {
      const res = await projectsAPI.getById(projectId);
      setProject(res.data.project);
    } catch (err) {
      console.error("Error loading project:", err);
    }
  };

  // ✅ Load all users
  const loadAllUsers = async () => {
    try {
      const res = await usersAPI.getAll();
      setAllUsers(res.data.users || res.data);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  // ✅ Add team member
  const handleAddTeamMember = async (e) => {
    e.preventDefault();
    try {
      const res = await projectsAPI.addTeamMember(projectId, { userId: selectedUser });
      setProject(res.data.project);
      setIsAddMemberModalOpen(false);
      setSelectedUser("");
    } catch (err) {
      console.error("Error adding member:", err);
    }
  };

  // ✅ Remove team member
  const handleRemoveTeamMember = async (memberId) => {
    try {
      const res = await projectsAPI.removeTeamMember(projectId, memberId);
      setProject(res.data.project);
    } catch (err) {
      console.error("Error removing member:", err);
    }
  };

  // ✅ Assign team lead
  const handleAssignTeamLead = async (memberId) => {
    try {
      const res = await projectsAPI.update(projectId, { teamLead: memberId });
      setProject(res.data.project);
    } catch (err) {
      console.error("Error assigning lead:", err);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadAllUsers();
    }
  }, [projectId]);

  if (!project) return <p>Loading project...</p>;

  return (
    <div>
      <h2>Team Management for {project.name}</h2>

      <h3>Team Members</h3>
      <ul>
        {(project.teamMembers || []).map((member) => (
          <li key={(member.user?._id) || member._id}>
            {(member.user?.firstName || member.user?.username || "")} {(member.user?.lastName || "")} ({member.role})
            {project.teamLead && (project.teamLead._id === (member.user?._id) || project.teamLead === (member.user?._id)) && <strong> ⭐ Team Lead</strong>}
            <button onClick={() => handleRemoveTeamMember(member.user?._id || member._id)}>
              Remove
            </button>
            <button onClick={() => handleAssignTeamLead(member.user?._id || member._id)}>
              Make Lead
            </button>
          </li>
        ))}
      </ul>

      <button onClick={() => setIsAddMemberModalOpen(true)}>Add Member</button>

      {isAddMemberModalOpen && (
        <form onSubmit={handleAddTeamMember}>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            required
          >
            <option value="">Select a user</option>
            {allUsers.map((user) => {
              const label = user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim();
              return (
                <option key={user._id} value={user._id}>
                  {label} ({user.role})
                </option>
              );
            })}
          </select>
          <button type="submit">Add</button>
          <button type="button" onClick={() => setIsAddMemberModalOpen(false)}>
            Cancel
          </button>
        </form>
      )}
    </div>
  );
};

export default TeamManagement;
