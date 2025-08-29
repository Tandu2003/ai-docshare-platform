import { Outlet } from 'react-router-dom';

import { useCan } from '@/lib/casl';
import { HomePage } from '@/pages';

import { Header } from './Header';

export const MainLayout: React.FC = () => {
  // Check if user can read documents (basic access permission)
  const canReadDocuments = useCan('read', 'Document');

  return (
    <div className="min-h-screen w-full max-w-7xl mx-auto">
      <Header />
      <main className="">{canReadDocuments ? <Outlet /> : <HomePage />}</main>
    </div>
  );
};
