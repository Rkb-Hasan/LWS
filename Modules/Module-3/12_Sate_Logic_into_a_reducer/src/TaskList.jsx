import Task from "./Task";

export default function TaskList({ tasks, onChangeTask, onDeleteTask }) {
  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          <Task
            onDeleteTask={onDeleteTask}
            onChangeTask={onChangeTask}
            task={task}
          />
        </li>
      ))}
    </ul>
  );
}
