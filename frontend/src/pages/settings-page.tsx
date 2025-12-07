import { useRef, useState, type ReactElement } from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  Globe,
  Save,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks';
import { FilesService } from '@/services/files.service';
import { authService } from '@/utils';

interface UserSettings {
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  website?: string;
  location?: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function SettingsPage(): ReactElement {
  const { user, fetchCurrentUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    bio: user?.bio || '',
    website: (user as any)?.website || '',
    location: (user as any)?.location || '',
  });
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const updatedUser = await authService.updateProfile({
        firstName: settings.firstName,
        lastName: settings.lastName,
        email: settings.email,
        bio: settings.bio,
        website: settings.website,
        location: settings.location,
      });

      // Refresh user data
      await fetchCurrentUser();

      toast.success('Cập nhật hồ sơ thành công!');

      // Update form with saved data
      setSettings({
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        bio: updatedUser.bio || '',
        website: (updatedUser as any).website || '',
        location: (updatedUser as any).location || '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Cập nhật hồ sơ thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu mới và xác nhận không khớp');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      toast.success('Đổi mật khẩu thành công!');

      // Clear form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Đổi mật khẩu thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handlePasswordChange = (key: keyof PasswordData, value: any) => {
    setPasswordData(prev => ({ ...prev, [key]: value }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ cho phép file ảnh (JPG, PNG, GIF, WEBP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước file không được vượt quá 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const response = await FilesService.uploadAvatar(file);

      if (response.success && response.data) {
        // Refresh user data
        await fetchCurrentUser();

        toast.success('Cập nhật ảnh đại diện thành công!');
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Cập nhật ảnh đại diện thất bại');
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Settings className="text-primary h-8 w-8" />
            Cài đặt
          </h1>
          <p className="text-muted-foreground mt-1">
            Quản lý cài đặt tài khoản và tùy chọn của bạn
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Settings */}
        <div className="space-y-6 lg:col-span-2">
          {/* Tabs */}
          <div className="bg-muted flex space-x-1 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Hồ sơ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'password'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Bảo mật
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Thông tin hồ sơ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="Avatar" />
                      ) : (
                        <AvatarFallback className="text-lg">
                          {settings.firstName.charAt(0)}
                          {settings.lastName.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-0 bottom-0 h-6 w-6 rounded-full"
                      onClick={handleAvatarClick}
                      disabled={isUploadingAvatar}
                    >
                      <Camera className="h-3 w-3" />
                    </Button>
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAvatarClick}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar
                        ? 'Đang tải lên...'
                        : 'Thay đổi ảnh đại diện'}
                    </Button>
                    <p className="text-muted-foreground mt-1 text-xs">
                      JPG, PNG hoặc GIF. Kích thước tối đa 5MB.
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Tên</Label>
                    <Input
                      id="firstName"
                      value={settings.firstName}
                      onChange={e =>
                        handleSettingChange('firstName', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Họ</Label>
                    <Input
                      id="lastName"
                      value={settings.lastName}
                      onChange={e =>
                        handleSettingChange('lastName', e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Địa chỉ email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={e => handleSettingChange('email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Tiểu sử</Label>
                  <Input
                    id="bio"
                    placeholder="Hãy cho chúng tôi biết về bạn..."
                    value={settings.bio || ''}
                    onChange={e => handleSettingChange('bio', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      placeholder="https://websitecuaban.com"
                      value={settings.website || ''}
                      onChange={e =>
                        handleSettingChange('website', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Địa chỉ</Label>
                    <Input
                      id="location"
                      placeholder="Thành phố, Quốc gia"
                      value={settings.location || ''}
                      onChange={e =>
                        handleSettingChange('location', e.target.value)
                      }
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Đổi mật khẩu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                  <Input
                    id="currentPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu hiện tại"
                    value={passwordData.currentPassword}
                    onChange={e =>
                      handlePasswordChange('currentPassword', e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Mật khẩu mới</Label>
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu mới"
                    value={passwordData.newPassword}
                    onChange={e =>
                      handlePasswordChange('newPassword', e.target.value)
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Mật khẩu phải có ít nhất 8 ký tự
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    value={passwordData.confirmPassword}
                    onChange={e =>
                      handlePasswordChange('confirmPassword', e.target.value)
                    }
                  />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {showPassword ? 'Ẩn' : 'Hiển thị'} mật khẩu
                </Button>

                <Button
                  onClick={handleChangePassword}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? 'Đang lưu...' : 'Đổi mật khẩu'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preferences Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Trạng thái tài khoản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Email đã xác thực</span>
                <Badge variant={user?.isVerified ? 'default' : 'secondary'}>
                  {user?.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Trạng thái tài khoản</span>
                <Badge variant={user?.isActive ? 'default' : 'destructive'}>
                  {user?.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Thành viên từ</span>
                <span className="text-muted-foreground text-sm">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('vi-VN')
                    : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
