import MovieList from "./components/cine/MovieList";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

function App() {
  return (
    <>
      <Header />
      <main>
        <div class="container grid lg:grid-cols-[218px_1fr] gap-14">
          <Sidebar />
          <MovieList />
        </div>
      </main>
      <Footer />
    </>
  );
}

export default App;
