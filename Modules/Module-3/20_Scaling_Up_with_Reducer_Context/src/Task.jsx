import { useState } from "react";
import { useTasksDispatch } from "./contexts/TaskContext";

const Task = ({ task }) => {
  const { id, done, text } = task;

  const [isEditing, setIsEditing] = useState(false);
  const dispatch = useTasksDispatch();

  let taskContent;

  if (isEditing) {
    taskContent = (
      <>
        <input
          type="text"
          value={text}
          onChange={(e) =>
            dispatch({
              type: "changed",
              task: { ...task, text: e.target.value },
            })
          }
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
        onChange={(e) =>
          dispatch({
            type: "changed",
            task: { ...task, done: e.target.checked },
          })
        }
      />
      {taskContent}
      <button
        onClick={() =>
          dispatch({
            type: "deleted",
            id,
          })
        }
      >
        Delete
      </button>
    </label>
  );
};

export default Task;
