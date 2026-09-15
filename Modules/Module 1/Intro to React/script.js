const productPrice = 5000;
const button = document.querySelector("#button");
const price = document.querySelector("#price");
const total = document.querySelector("#total");
let totalPrice = 0;

price.innerText = productPrice + "Tk";
total.innerText = "Total:" + 0 + "Tk";
button.addEventListener("click", () => {
  totalPrice += productPrice;

  total.innerText = "Total:" + totalPrice + "Tk";
});
