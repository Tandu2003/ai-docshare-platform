import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LoginForm } from '@/components/auth';
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Get callback URL from query params or state
  const callbackFromQuery = searchParams.get('callback');
  const callbackFromState = location.state?.from?.pathname;
  // Decode callback URL from query params if available
  const callbackUrl = callbackFromQuery
    ? decodeURIComponent(callbackFromQuery)
    : callbackFromState || '/dashboard';
  const handleSuccess = () => {
    navigate(callbackUrl, { replace: true });
  };

  const switchToRegister = () => {
    // Preserve callback URL when switching to register
    const callbackParam = callbackFromQuery ? `?callback=${callbackFromQuery}` : '';
    navigate(`/auth/register${callbackParam}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            DocShare Platform
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
