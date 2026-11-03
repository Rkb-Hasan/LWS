import { useState } from "react";
import MovieList from "./components/cine/MovieList";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { MovieContext } from "./contexts";

function App() {
  const [cartData, setCartData] = useState([]);

  return (
    <>
      <MovieContext value={{ cartData, setCartData }}>
        <Header />
        <main>
          <div class="container grid lg:grid-cols-[218px_1fr] gap-14">
            <Sidebar />
            <MovieList />
          </div>
        </main>
        <Footer />
      </MovieContext>
    </>
  );
}

export default App;
