import { getAllMovies } from "../../data/movies";
import Moviecard from "./Moviecard";

export default function MovieList() {
  const movies = getAllMovies();

  return (
    <div className="content">
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-7">
        {movies.map((movie) => (
          <Moviecard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
