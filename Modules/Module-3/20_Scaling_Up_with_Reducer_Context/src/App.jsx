import AddTask from "./AddTask";
import TaskList from "./TaskList";
import TasksProvider from "./contexts/TaskContext";
export default function TaskApp() {
  return (
    <TasksProvider>
      <h1>Prague itinerary</h1>
      <AddTask />
      <TaskList />
    </TasksProvider>
  );
}
