import { useContext } from "react";
import MovieList from "./components/cine/MovieList";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { ThemeContext } from "./contexts";
export default function Page() {
  const { darkmode } = useContext(ThemeContext);

  return (
    <div className={` h-full w-full ${darkmode ? "dark" : ""}`}>
      <Header />
      <main>
        <div className="container grid lg:grid-cols-[218px_1fr] gap-14">
          <Sidebar />
          <MovieList />
        </div>
      </main>
      <Footer />
    </div>
  );
}
