import React from "react";

export const EditProjectModal = ({
  editProject,
  setEditProject,
  onClose,
  onSubmit,
}) => {
  return (
    <div className="modal">
      <h2>Edit Project</h2>

      <form onSubmit={onSubmit}>
        <input
          type="text"
          value={editProject.name}
          onChange={(e) =>
            setEditProject({ ...editProject, name: e.target.value })
          }
          required
        />

        <textarea
          value={editProject.description}
          onChange={(e) =>
            setEditProject({ ...editProject, description: e.target.value })
          }
        />

        <button type="submit">Save</button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
};
