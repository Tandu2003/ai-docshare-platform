import { configureStore } from '@reduxjs/toolkit';

import authReducer from '@/store/slices/auth.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Future reducers can be added here
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
