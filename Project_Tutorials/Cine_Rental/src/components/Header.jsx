import { useContext, useState } from "react";
import moon from "../assets/icons/moon.svg";
// import sun from "../assets/icons/sun.svg";
import logo from "../assets/logo.svg";
import ring from "../assets/ring.svg";
import shoppingCart from "../assets/shopping-cart.svg";
import { MovieContext } from "../contexts";
import CartDetails from "./cine/CartDetails";

export default function Header() {
  const [showCart, setShowCart] = useState(false);

  const { cartData } = useContext(MovieContext);

  return (
    <header>
      {showCart && <CartDetails onClose={() => setShowCart(false)} />}

      <nav className="container flex items-center justify-between space-x-10 py-6">
        <a href="index.html">
          <img src={logo} width="139" height="26" alt="logo" />
        </a>

        <ul className="flex items-center space-x-5">
          <li>
            <a
              className="bg-primary/20 dark:bg-primary/7 rounded-lg backdrop-blur-[2px] p-1 inline-block"
              href="#"
            >
              <img src={ring} width="24" height="24" alt="ring" />
            </a>
          </li>
          <li>
            <a
              className="bg-primary/20 dark:bg-primary/7 rounded-lg backdrop-blur-[2px] p-1 inline-block"
              href="#"
            >
              {/* <img src={sun} width="24" height="24" alt="sun" /> */}
              <img src={moon} width="24" height="24" alt="moon" />
            </a>
          </li>
          <li>
            <a
              className="bg-primary/20 dark:bg-primary/7 rounded-lg backdrop-blur-[2px] p-1 inline-block"
              href="#"
              onClick={() => setShowCart(true)}
            >
              <img
                src={shoppingCart}
                width="24"
                height="24"
                alt="shoppingCart"
              />
              {cartData.length > 0 && (
                <span className="rounded-full absolute -top-3 left-5 bg-[#12CF6F] text-white text-center p-px w-5 h-5 text-xs font-bold">
                  {cartData.length}
                </span>
              )}
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
