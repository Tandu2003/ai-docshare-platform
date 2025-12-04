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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-6 text-center text-2xl font-bold">
            Chào mừng, {user.firstName}!
          </h1>

          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 font-semibold">Thông tin người dùng</h3>
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

            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 font-semibold">Quyền hạn</h3>
              <div className="flex flex-wrap gap-2">
                {user.role.permissions.map((permission, index) => (
                  <span
                    key={`${permission.action}-${permission.subject}-${index}`}
                    className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
                  >
                    {permission.action} {permission.subject}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 font-semibold">Mô tả vai trò</h3>
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Nền tảng DocShare
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Đăng nhập vào tài khoản của bạn' : 'Tạo tài khoản mới'}
          </p>
        </div>

        {isLogin ? (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setIsLogin(true)}
          />
        )}
      </div>
    </div>
  );
};
