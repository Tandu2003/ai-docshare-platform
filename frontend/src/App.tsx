import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthInitializer } from '@/components/auth';
import ErrorBoundary from '@/components/ErrorBoundary';

import '@/index.css';

import { router } from '@/router';
import { store } from '@/store';
import { setStore } from '@/utils/auth.service';

// Set store for AuthService to access Redux state
setStore(store);

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AuthInitializer>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors />
        </AuthInitializer>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
