import { useState } from "react";
import AddTaskModal from "./AddTaskModal";
import NoTasksFound from "./NoTasksFound";
import SearchTask from "./SearchTask";
import TaskActions from "./TaskActions";
import TaskList from "./TaskList";

const TaskBoard = () => {
  const defaultTask = {
    id: crypto.randomUUID(),
    title: "Learn React",
    description: "Learn React Learn ReactLearn ReactLearn React",
    tags: ["web", "react", "JS", "Next"],
    isFavorite: false,
    priority: "high",
  };

  const [tasks, setTasks] = useState([defaultTask]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskToUpdate, setTaskToUpdate] = useState(null);

  function handleEditTask(task) {
    setTaskToUpdate(task);
    setShowAddModal(true);
  }

  function handleAddEditTask(e, newTask, isAdd) {
    e.preventDefault();
    if (isAdd) {
      setTasks([...tasks, newTask]);
    } else {
      setTasks(
        tasks.map((task) => {
          if (task.id === newTask.id) {
            return newTask;
          } else {
            return task;
          }
        }),
      );
    }
    setTaskToUpdate(null);
    setShowAddModal(false);
  }

  function handleDeleteTask(taskId) {
    const tasksAfterDelete = tasks.filter((task) => task.id !== taskId);

    setTasks(tasksAfterDelete);
  }

  function handleFavourite(taskId) {
    const newTasks = tasks.map((task) => {
      if (taskId === task.id) {
        return { ...task, isFavorite: !task.isFavorite };
      } else {
        return task;
      }
    });

    setTasks(newTasks);
  }

  function handleCloseClick() {
    setShowAddModal(false);
    setTaskToUpdate(null);
  }

  function handleSearch(searchTerm) {
    // only returns the true tasks not bool
    const filtered = tasks.filter((task) =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setTasks(filtered);
  }

  return (
    <section className="mb-20" id="tasks">
      {showAddModal && (
        <AddTaskModal
          taskToUpdate={taskToUpdate}
          onSave={handleAddEditTask}
          onCloseClick={handleCloseClick}
        />
      )}

      <div className="container">
        <div className="p-2 flex justify-end">
          <SearchTask onSearch={handleSearch} />
        </div>

        <div className="rounded-xl border border-[rgba(206,206,206,0.12)] bg-[#1D212B] px-6 py-8 md:px-9 md:py-16">
          <TaskActions
            onDeleteAllClick={() => setTasks([])}
            onAddClick={() => setShowAddModal(true)}
          />
          {tasks.length > 0 ? (
            <TaskList
              onDelete={handleDeleteTask}
              onEdit={handleEditTask}
              onFav={handleFavourite}
              tasks={tasks}
            />
          ) : (
            <NoTasksFound />
          )}
        </div>
      </div>
    </section>
  );
};

export default TaskBoard;
