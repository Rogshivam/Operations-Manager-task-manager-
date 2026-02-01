import React from "react";

export const TaskModal = ({
  newTask,
  setNewTask,
  setTaskFiles,
  onClose,
  onSubmit,
  members,
}) => {
  return (
    <div className="modal">
      <h2>Add Task</h2>

      <form onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Title"
          value={newTask.title}
          onChange={(e) =>
            setNewTask({ ...newTask, title: e.target.value })
          }
          required
        />

        <textarea
          placeholder="Description"
          value={newTask.description}
          onChange={(e) =>
            setNewTask({ ...newTask, description: e.target.value })
          }
        />

        <select
          value={newTask.assignedTo}
          onChange={(e) =>
            setNewTask({ ...newTask, assignedTo: e.target.value })
          }
        >
          <option value="">Assign to</option>
          {members.map((m) => (
            <option key={m.id || m._id} value={m.username}>
              {m.username}
            </option>
          ))}
        </select>

        <input
          type="file"
          multiple
          onChange={(e) => setTaskFiles([...e.target.files])}
        />

        <button type="submit">Create</button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
};
