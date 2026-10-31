import { useState } from "react";
import { useTasks, useTasksDispatch } from "./contexts/TaskContext";
import { getNextId } from "./utils/getNextId";

export default function AddTask() {
  const [text, setText] = useState("");
  const dispatch = useTasksDispatch();
  const tasks = useTasks();
  return (
    <>
      <input
        placeholder="Add task"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={() => {
          setText("");

          dispatch({
            type: "added",
            text,
            id: getNextId(tasks),
          });
        }}
      >
        Add
      </button>
    </>
  );
}
