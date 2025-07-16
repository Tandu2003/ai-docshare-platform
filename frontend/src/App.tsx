import { Toaster } from 'sonner';

import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

import { AuthInitializer } from './components/auth';
import './index.css';
import { router } from './router';
import { store } from './store';

function App() {
  return (
    <Provider store={store}>
      <AuthInitializer>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </AuthInitializer>
    </Provider>
  );
}

export default App;
