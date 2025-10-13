import { Bell, Eye, EyeOff, Globe, Palette, Save, Settings, Shield, User } from 'lucide-react';

import { useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks';

interface UserSettings {
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  website?: string;
  location?: string;
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showLocation: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    bio: '',
    website: '',
    location: '',
    language: 'en',
    timezone: 'UTC',
    theme: 'system',
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    profileVisibility: 'public',
    showEmail: false,
    showLocation: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // Show success message
    }, 1000);
  };

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Cài đặt
          </h1>
          <p className="text-muted-foreground mt-1">Quản lý cài đặt tài khoản và tùy chọn của bạn</p>
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Thông tin hồ sơ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {settings.firstName.charAt(0)}
                    {settings.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">
                    Thay đổi ảnh đại diện
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG hoặc GIF. Kích thước tối đa 2MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Tên</Label>
                  <Input
                    id="firstName"
                    value={settings.firstName}
                    onChange={(e) => handleSettingChange('firstName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Họ</Label>
                  <Input
                    id="lastName"
                    value={settings.lastName}
                    onChange={(e) => handleSettingChange('lastName', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Địa chỉ email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleSettingChange('email', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Tiểu sử</Label>
                <Input
                  id="bio"
                  placeholder="Hãy cho chúng tôi biết về bạn..."
                  value={settings.bio}
                  onChange={(e) => handleSettingChange('bio', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://websitecuaban.com"
                    value={settings.website}
                    onChange={(e) => handleSettingChange('website', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="Thành phố, Quốc gia"
                    value={settings.location}
                    onChange={(e) => handleSettingChange('location', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Thông báo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Thông báo qua email</Label>
                  <p className="text-sm text-muted-foreground">
                    Nhận thông báo qua email cho các cập nhật quan trọng
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Thông báo đẩy</Label>
                  <p className="text-sm text-muted-foreground">
                    Nhận thông báo đẩy trong trình duyệt
                  </p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email tiếp thị</Label>
                  <p className="text-sm text-muted-foreground">
                    Nhận email về các tính năng mới và khuyến mãi
                  </p>
                </div>
                <Switch
                  checked={settings.marketingEmails}
                  onCheckedChange={(checked) => handleSettingChange('marketingEmails', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Quyền riêng tư & Bảo mật
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Hiển thị hồ sơ</Label>
                <Select
                  value={settings.profileVisibility}
                  onValueChange={(value) => handleSettingChange('profileVisibility', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Công khai</SelectItem>
                    <SelectItem value="private">Riêng tư</SelectItem>
                    <SelectItem value="friends">Chỉ bạn bè</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Hiển thị địa chỉ email</Label>
                  <p className="text-sm text-muted-foreground">
                    Cho phép người khác xem địa chỉ email của bạn
                  </p>
                </div>
                <Switch
                  checked={settings.showEmail}
                  onCheckedChange={(checked) => handleSettingChange('showEmail', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Hiển thị vị trí</Label>
                  <p className="text-sm text-muted-foreground">
                    Cho phép người khác xem vị trí của bạn
                  </p>
                </div>
                <Switch
                  checked={settings.showLocation}
                  onCheckedChange={(checked) => handleSettingChange('showLocation', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Đổi mật khẩu</Label>
                <div className="space-y-2">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Mật khẩu hiện tại" />
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Mật khẩu mới" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Xác nhận mật khẩu mới"
                  />
                  <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPassword ? 'Ẩn' : 'Hiển thị'} mật khẩu
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preferences Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Tùy chọn
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ngôn ngữ</Label>
                <Select
                  value={settings.language}
                  onValueChange={(value) => handleSettingChange('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">Tiếng Anh</SelectItem>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="es">Tiếng Tây Ban Nha</SelectItem>
                    <SelectItem value="fr">Tiếng Pháp</SelectItem>
                    <SelectItem value="de">Tiếng Đức</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Giao diện</Label>
                <Select
                  value={settings.theme}
                  onValueChange={(value) => handleSettingChange('theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Sáng</SelectItem>
                    <SelectItem value="dark">Tối</SelectItem>
                    <SelectItem value="system">Hệ thống</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Múi giờ</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => handleSettingChange('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Giờ Đông</SelectItem>
                    <SelectItem value="America/Los_Angeles">Giờ Thái Bình Dương</SelectItem>
                    <SelectItem value="Europe/London">Luân Đôn</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

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
                <Badge variant="default">Đã xác thực</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Trạng thái tài khoản</span>
                <Badge variant="default">Đang hoạt động</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Thành viên từ</span>
                <span className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Khu vực nguy hiểm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="destructive" className="w-full">
                Xóa tài khoản
              </Button>
              <p className="text-xs text-muted-foreground">
                Hành động này không thể hoàn tác. Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
