import { useLocation, useNavigate } from 'react-router-dom';

import { LoginForm } from '@/components/auth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSuccess = () => {
    navigate(from, { replace: true });
  };

  const switchToRegister = () => {
    navigate('/auth/register');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            AI DocShare Platform
          </h1>
          <p className="text-gray-600">Đăng nhập vào tài khoản của bạn</p>
        </div>

        <LoginForm
          onSuccess={handleSuccess}
          onSwitchToRegister={switchToRegister}
        />
      </div>
    </div>
  );
};
