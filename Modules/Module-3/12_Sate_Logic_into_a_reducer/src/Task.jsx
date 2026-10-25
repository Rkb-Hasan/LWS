import { useState } from "react";

const Task = ({ task, onChangeTask, onDeleteTask }) => {
  const { id, done, text } = task;

  const [isEditing, setIsEditing] = useState(false);

  let taskContent;

  if (isEditing) {
    taskContent = (
      <>
        <input
          type="text"
          value={text}
          onChange={(e) => onChangeTask({ ...task, text: e.target.value })}
        />
        <button onClick={() => setIsEditing(false)}>Save</button>
      </>
    );
  } else {
    taskContent = (
      <>
        {text}
        <button onClick={() => setIsEditing(true)}>Edit</button>
      </>
    );
  }

  return (
    <label>
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => onChangeTask({ ...task, done: e.target.checked })}
      />
      {taskContent}
      <button onClick={() => onDeleteTask(id)}>Delete</button>
    </label>
  );
};

export default Task;
