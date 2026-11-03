import { useReducer, useState } from "react";
import { Bounce, ToastContainer } from "react-toastify";
import { MovieContext, ThemeContext } from "./contexts";
import Page from "./Page";
import { cartReducer, initialState } from "./reducers/CartReducer";
function App() {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [darkmode, setDarkmode] = useState(true);
  return (
    <>
      <MovieContext value={{ state, dispatch }}>
        <ThemeContext value={{ darkmode, setDarkmode }}>
          <Page />
          <ToastContainer
            position={"bottom-right"}
            theme={darkmode ? "dark" : "light"}
            transition={Bounce}
          />
        </ThemeContext>
      </MovieContext>
    </>
  );
}

export default App;
