import { useState } from "react";
import AddTask from "./AddTask";
import TaskList from "./TaskList";

export default function TaskApp() {
  const [tasks, setTasks] = useState(initialTasks);

  const getNextId = (data) => {
    const maxId = data.reduce((prev, curr) =>
      prev && prev.id > curr.id ? prev.id : curr.id,
    );

    return maxId + 1;
  };

  const handleAddTask = (text) => {
    setTasks([
      ...tasks,
      {
        id: getNextId(tasks),
        text,
        done: false,
      },
    ]);
  };
  const handleChangeTask = (task) => {
    console.log(task);
    const nextTasks = tasks.map((t) => {
      if (t.id === task.id) {
        return task;
      } else {
        return t;
      }
    });

    setTasks(nextTasks);
  };

  const handleDeleteTask = (id) => {
    setTasks(tasks.filter((t) => t.id !== id));
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
