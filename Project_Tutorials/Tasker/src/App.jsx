import Hero from "../Hero";
import Footer from "./Footer";
import Header from "./Header";
import TaskBoard from "./task/TaskBoard";

function App() {
  return (
    <>
      <Header />
      <div className="flex flex-col justify-center items-center">
        <Hero />
        <TaskBoard />
      </div>
      <Footer />
    </>
  );
}

export default App;
