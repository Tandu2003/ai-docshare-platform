import { useEffect } from 'react';

import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { toast, Toaster } from 'sonner';

import { AuthInitializer } from '@/components/auth';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getSocket } from '@/lib/socket';

import '@/index.css';

import { router } from '@/router';
import { store } from '@/store';
import { setStore } from '@/utils/auth.service';

// Set store for AuthService to access Redux state
setStore(store);

function App() {
  useEffect(() => {
    const socket = getSocket();
    const handler = (event: any) => {
      if (event?.type === 'view') {
        toast.info('Có lượt xem mới cho tài liệu');
      } else if (event?.type === 'download') {
        toast.success('Có lượt tải xuống mới cho tài liệu');
      } else if (event?.type === 'moderation') {
        if (event.status === 'approved') {
          toast.success('Tài liệu của bạn đã được duyệt');
        } else {
          toast.error('Tài liệu của bạn đã bị từ chối');
        }
      }
    };
    socket.on('notification', handler);
    return () => {
      socket.off('notification', handler);
    };
  }, []);

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
