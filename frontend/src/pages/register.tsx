import { useNavigate } from 'react-router-dom'

import { RegisterForm } from '@/components/auth'

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/dashboard', { replace: true });
  };

  const switchToLogin = () => {
    navigate('/auth/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            DocShare Platform
          </h1>
          <p className="text-gray-600">Tạo tài khoản mới</p>
        </div>

        <RegisterForm
          onSuccess={handleSuccess}
          onSwitchToLogin={switchToLogin}
        />
      </div>
    </div>
  );
};
