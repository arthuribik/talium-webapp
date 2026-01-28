import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from '@/store/authSlice';
import { api } from '@/services/api';

const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'token', 'refreshToken', 'isAuthenticated'],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// Set API authorization header on rehydration
let isRehydrated = false;
persistor.subscribe(() => {
  const state = store.getState();
  if (!isRehydrated && state.auth._persist?.rehydrated) {
    isRehydrated = true;
    // Set token immediately after rehydration
    const token = state.auth.token || localStorage.getItem('token');
    const refreshToken = state.auth.refreshToken || localStorage.getItem('refreshToken');
    if (token) {
      const authHeader = `Bearer ${token.trim()}`;
      api.defaults.headers.common['Authorization'] = authHeader;
      // Ensure tokens are in localStorage
      try {
        if (!localStorage.getItem('token')) {
          localStorage.setItem('token', token);
        }
        if (refreshToken && !localStorage.getItem('refreshToken')) {
          localStorage.setItem('refreshToken', refreshToken);
        }
      } catch (e) {
        console.error('Error syncing tokens to localStorage:', e);
      }
    } else {
      // Clear token if not in state
      delete api.defaults.headers.common['Authorization'];
    }
  } else if (isRehydrated) {
    // Update token if it changes after rehydration
    const token = state.auth.token || localStorage.getItem('token');
    const refreshToken = state.auth.refreshToken || localStorage.getItem('refreshToken');
    if (token) {
      const authHeader = `Bearer ${token.trim()}`;
      api.defaults.headers.common['Authorization'] = authHeader;
      // Sync to localStorage
      try {
        localStorage.setItem('token', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
      } catch (e) {
        console.error('Error syncing tokens to localStorage:', e);
      }
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

