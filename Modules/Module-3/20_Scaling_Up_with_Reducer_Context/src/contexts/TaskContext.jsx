import { createContext, useContext, useReducer } from "react";
import taskReducer from "../reducers/taskreducer";

export const TaskContext = createContext(null);
export const TaskDispatchContext = createContext(null);

export default function TasksProvider({ children }) {
  const [tasks, dispatch] = useReducer(taskReducer, initialTasks);

  return (
    <TaskContext value={tasks}>
      <TaskDispatchContext value={dispatch}>{children}</TaskDispatchContext>
    </TaskContext>
  );
}

export function useTasks() {
  return useContext(TaskContext);
}
export function useTasksDispatch() {
  return useContext(TaskDispatchContext);
}

const initialTasks = [
  { id: 0, text: "Visit Kafka Museum", done: true },
  { id: 1, text: "Watch a puppet show", done: false },
  { id: 2, text: "Lennon Wall pic", done: false },
];
