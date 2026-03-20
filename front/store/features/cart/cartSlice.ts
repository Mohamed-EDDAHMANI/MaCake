import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
  id: string; // unique cart item id
  productId: string;
  patissiereId?: string;
  patissiereAddress?: string;
  patissiereLatitude?: number | null;
  patissiereLongitude?: number | null;
  title: string;
  price: number;
  quantity: number;
  imageUri?: string;
  colors?: string;
  garnish?: string;
  message?: string;
  createdAt: string;
}

export interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

type AddItemPayload = Omit<CartItem, "id" | "createdAt"> & {
  id?: string;
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<AddItemPayload>) {
      const { id, ...rest } = action.payload;
      const cartId = id ?? `${rest.productId}-${Date.now()}`;
      state.items.push({
        id: cartId,
        ...rest,
        createdAt: new Date().toISOString(),
      });
    },
    clearCart(state) {
      state.items = [];
    },
    updateQuantity(
      state,
      action: PayloadAction<{ id: string; delta: 1 | -1 }>
    ) {
      const item = state.items.find((it) => it.id === action.payload.id);
      if (!item) return;
      const nextQty = item.quantity + action.payload.delta;
      if (nextQty <= 0) {
        state.items = state.items.filter((it) => it.id !== action.payload.id);
      } else {
        item.quantity = nextQty;
      }
    },
  },
});

export const { addItem, clearCart, updateQuantity } = cartSlice.actions;
export const cartReducer = cartSlice.reducer;
export default cartSlice.reducer;
