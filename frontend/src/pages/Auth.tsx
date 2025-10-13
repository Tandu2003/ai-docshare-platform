import React, { useState } from 'react';

import { LoginForm, RegisterForm } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { user, isAuthenticated, logout } = useAuth();

  const handleAuthSuccess = () => {
    console.log('Auth success!');
  };

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Chào mừng, {user.firstName}!</h1>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Thông tin người dùng</h3>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>Tên đăng nhập:</strong> {user.username}
              </p>
              <p>
                <strong>Vai trò:</strong> {user.role.name}
              </p>
              <p>
                <strong>Đã xác thực:</strong> {user.isVerified ? 'Có' : 'Không'}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Quyền hạn</h3>
              <div className="flex flex-wrap gap-2">
                {user.role.permissions.map((permission, index) => (
                  <span
                    key={`${permission.action}-${permission.subject}-${index}`}
                    className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                  >
                    {permission.action} {permission.subject}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Mô tả vai trò</h3>
              <p>{user.role.description}</p>
            </div>

            <Button onClick={logout} className="w-full" variant="outline">
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nền tảng AI DocShare</h1>
          <p className="text-gray-600">
            {isLogin ? 'Đăng nhập vào tài khoản của bạn' : 'Tạo tài khoản mới'}
          </p>
        </div>

        {isLogin ? (
          <LoginForm onSuccess={handleAuthSuccess} onSwitchToRegister={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onSuccess={handleAuthSuccess} onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
};
