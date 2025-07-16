import { useNavigate } from 'react-router-dom';

import { RegisterForm } from '../components/auth';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/dashboard', { replace: true });
  };

  const switchToLogin = () => {
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI DocShare Platform</h1>
          <p className="text-gray-600">Create a new account</p>
        </div>

        <RegisterForm onSuccess={handleSuccess} onSwitchToLogin={switchToLogin} />
      </div>
    </div>
  );
};
