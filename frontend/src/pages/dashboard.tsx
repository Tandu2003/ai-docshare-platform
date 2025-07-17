import { Download, FileText, Upload, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks';

export const DashboardPage: React.FC = () => {
  const { user, hasPermission, isAdmin, isModerator } = useAuth();

  const stats = [
    {
      title: 'Total Documents',
      value: '24',
      icon: FileText,
      description: 'Documents uploaded',
    },
    {
      title: 'Downloads',
      value: '1,234',
      icon: Download,
      description: 'Total downloads',
    },
    {
      title: 'Users',
      value: '12',
      icon: Users,
      description: 'Active users',
    },
    {
      title: 'Uploads',
      value: '8',
      icon: Upload,
      description: 'This month',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-600">Here's what's happening with your documents today.</p>
      </div>

      {/* User Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Account information and role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Full Name</p>
              <p className="text-lg">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-lg">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Username</p>
              <p className="text-lg">@{user?.username}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Role</p>
              <Badge variant={isAdmin() ? 'destructive' : isModerator() ? 'default' : 'secondary'}>
                {user?.role.name}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${user?.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                />
                <span className="text-sm">{user?.isActive ? 'Active' : 'Inactive'}</span>
                {user?.isVerified && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>What you can do on this platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user?.role.permissions.map((permission) => (
                <Badge key={permission} variant="outline" className="text-xs">
                  {permission.replace(/[_:]/g, ' ').toLowerCase()}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <Icon className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you might want to perform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hasPermission('upload:documents') && (
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <Upload className="h-6 w-6 text-blue-600 mb-2" />
                <h3 className="font-medium">Upload Document</h3>
                <p className="text-sm text-gray-600">Share a new document</p>
              </div>
            )}

            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <FileText className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="font-medium">Browse Documents</h3>
              <p className="text-sm text-gray-600">Find and download documents</p>
            </div>

            {(isAdmin() || isModerator()) && (
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <Users className="h-6 w-6 text-purple-600 mb-2" />
                <h3 className="font-medium">Manage Users</h3>
                <p className="text-sm text-gray-600">Admin and moderation tools</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
