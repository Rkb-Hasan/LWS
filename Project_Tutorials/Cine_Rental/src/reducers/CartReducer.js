const initialState = {
  cartData: [],
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_TO_CART":
      return {
        cartData: [...state.cartData, action.payload],
      };

    case "REMOVE_FROM_CART":
      return {
        cartData: state.cartData.filter(
          (item) => item.id !== action.payload.id,
        ),
      };

    default:
      throw new Error("Action not founds");
  }
};

export { cartReducer, initialState };
