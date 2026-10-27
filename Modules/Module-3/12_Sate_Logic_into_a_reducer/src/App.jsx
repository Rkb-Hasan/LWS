import { useReducer } from "react";
import AddTask from "./AddTask";
import TaskList from "./TaskList";
import taskReducer from "./reducers/taskreducer";

export default function TaskApp() {
  const [tasks, dispatch] = useReducer(taskReducer, initialTasks);

  const getNextId = (data) => {
    if (!data.length) return 0;

    const maxId = data.reduce((prev, curr) =>
      prev && prev.id > curr.id ? prev.id : curr.id,
    );

    return maxId + 1;
  };

  const handleAddTask = (text) => {
    dispatch({
      type: "added",
      text,
      id: getNextId(tasks),
    });
  };

  const handleChangeTask = (task) => {
    dispatch({
      type: "changed",
      task,
    });
  };

  const handleDeleteTask = (id) => {
    dispatch({
      type: "deleted",
      id,
    });
  };

  return (
    <>
      <h1>Prague itinerary</h1>
      <AddTask onAdd={handleAddTask} />
      <TaskList
        tasks={tasks}
        onChangeTask={handleChangeTask}
        onDeleteTask={handleDeleteTask}
      />
    </>
  );
}

const initialTasks = [
  { id: 0, text: "Visit Kafka Museum", done: true },
  { id: 1, text: "Watch a puppet show", done: false },
  { id: 2, text: "Lennon Wall pic", done: false },
];
