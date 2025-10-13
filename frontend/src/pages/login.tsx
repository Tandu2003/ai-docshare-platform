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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI DocShare Platform</h1>
          <p className="text-gray-600">Đăng nhập vào tài khoản của bạn</p>
        </div>

        <LoginForm onSuccess={handleSuccess} onSwitchToRegister={switchToRegister} />
      </div>
    </div>
  );
};
