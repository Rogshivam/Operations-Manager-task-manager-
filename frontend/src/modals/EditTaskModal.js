import React from "react";

export const EditTaskModal = ({
  editTask,
  setEditTask,
  setEditTaskFiles,
  onClose,
  onSubmit,
  members,
}) => {
  return (
    <div className="modal">
      <h2>Edit Task</h2>

      <form onSubmit={onSubmit}>
        <input
          type="text"
          value={editTask.title}
          onChange={(e) =>
            setEditTask({ ...editTask, title: e.target.value })
          }
          required
        />

        <textarea
          value={editTask.description}
          onChange={(e) =>
            setEditTask({ ...editTask, description: e.target.value })
          }
        />

        <select
          value={editTask.assignedTo}
          onChange={(e) =>
            setEditTask({ ...editTask, assignedTo: e.target.value })
          }
        >
          {members.map((m) => (
            <option key={m.id || m._id} value={m.username}>
              {m.username}
            </option>
          ))}
        </select>

        <input
          type="file"
          multiple
          onChange={(e) => setEditTaskFiles([...e.target.files])}
        />

        <button type="submit">Update</button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
};
