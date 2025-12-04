import type { ReactElement } from 'react';

import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthInitializer } from '@/components/auth';
import { ErrorBoundary } from '@/components/error-boundary';
import { SocketProvider } from '@/components/socket-provider';

import '@/index.css';

import { router } from '@/router';
import { store } from '@/store';
import { setStore } from '@/utils/auth.service';

// Set store for AuthService to access Redux state
setStore(store);

export function App(): ReactElement {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AuthInitializer>
          <SocketProvider>
            <RouterProvider router={router} />
          </SocketProvider>
          <Toaster position="top-right" richColors />
        </AuthInitializer>
      </Provider>
    </ErrorBoundary>
  );
}
