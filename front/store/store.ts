import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authReducer } from "./features/auth";
import { catalogReducer } from "./features/catalog";
import { followReducer } from "./features/follow";

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["auth"], // only persist auth slice
};

const rootReducer = combineReducers({
  auth: authReducer,
  catalog: catalogReducer,
  follow: followReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// Derive RootState from rootReducer so state.auth/state.catalog are typed;
// store.getState() can be inferred as PersistPartial only when using persistReducer.
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
