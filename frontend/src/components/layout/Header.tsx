import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  FileText,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  Tags,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { useCan } from '@/lib/casl';
import { cn } from '@/lib/utils';
import { logoutUser } from '@/store/slices/auth.slice';

// All navigation items - always visible
const allNavigationItems = [
  {
    title: 'Home',
    icon: Home,
    path: '/',
  },
  {
    title: 'Documents',
    icon: FileText,
    path: '/documents',
  },
  {
    title: 'Upload',
    icon: Upload,
    path: '/upload',
  },
  {
    title: 'Categories',
    icon: Tags,
    path: '/categories',
  },
  {
    title: 'Search',
    icon: Search,
    path: '/search',
  },
];

// Admin navigation items
const adminNavigationItems = [
  {
    title: 'User Management',
    icon: Users,
    path: '/admin/users',
  },
  {
    title: 'Document Moderation',
    icon: FileText,
    path: '/admin/documents',
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    path: '/admin/analytics',
  },
  {
    title: 'System Settings',
    icon: Settings,
    path: '/admin/settings',
  },
];

// Notification data
const notificationData = [
  {
    title: 'Document Approved',
    message: 'Your document "AI Basics" has been approved',
    time: '2 hours ago',
  },
  {
    title: 'New Comment',
    message: 'Someone commented on your document',
    time: '1 day ago',
  },
  {
    title: 'Welcome to DocShare AI',
    message: 'Thank you for joining our platform',
    time: '3 days ago',
  },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { user } = useAppSelector((state: any) => state.auth);

  // CASL permission checks
  const canReadNotifications = useCan('read', 'Notification');
  const canReadUserProfile = useCan('read', 'User');
  const canModerateUsers = useCan('moderate', 'User');

  const handleLogout = () => {
    dispatch(logoutUser() as any);
    navigate('/auth/login');
  };

  const isActiveRoute = (path: string) => location.pathname === path;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Render main navigation item
  const renderMainNavItem = (item: any) => (
    <Link
      key={item.path}
      to={item.path}
      className={cn(
        'flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
        isActiveRoute(item.path)
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      )}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.title}</span>
    </Link>
  );

  // Render admin navigation item
  const renderAdminNavItem = (item: any) => (
    <Link
      key={item.path}
      to={item.path}
      className={cn(
        'flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
        isActiveRoute(item.path)
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      )}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.title}</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="hidden text-xl font-bold sm:inline-block">DocShare AI</span>
            </Link>
          </div>

          {/* Main Navigation - Top Level - Always show all items */}
          <nav className="hidden lg:flex items-center space-x-1">
            {allNavigationItems.map(renderMainNavItem)}
          </nav>

          {/* Right Side - User Menu & Notifications */}
          <div className="flex items-center space-x-4">
            {/* Notifications - Only for users with notification permissions */}
            {canReadNotifications && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                      {notificationData.length}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-64 overflow-y-auto">
                    {notificationData.map((notification, index) => (
                      <div key={index} className="p-3 hover:bg-accent rounded-md">
                        <div className="text-sm font-medium">{notification.title}</div>
                        <div className="text-xs text-muted-foreground">{notification.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {notification.time}
                        </div>
                      </div>
                    ))}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link to="/notifications" className="w-full text-center">
                      View All Notifications
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User Menu - Only for users with profile permissions */}
            {canReadUserProfile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar} alt={user?.firstName} />
                      <AvatarFallback>
                        {user ? getInitials(user.firstName, user.lastName) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline-block">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Login/Register buttons for users without profile permissions
              <div className="flex items-center space-x-2">
                <Button variant="ghost" onClick={() => navigate('/auth/login')}>
                  Đăng nhập
                </Button>
                <Button onClick={() => navigate('/auth/register')}>Đăng ký</Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden">
            <Separator className="my-4" />
            <nav className="space-y-2 pb-4">
              {/* Main Navigation - Always show all items */}
              <div className="space-y-1">
                <div className="px-3 py-2 text-sm font-medium text-muted-foreground">Main</div>
                {allNavigationItems.map(renderMainNavItem)}
              </div>

              {/* Admin Navigation - Only for users with moderation permissions */}
              {canModerateUsers && (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-sm font-medium text-muted-foreground">Admin</div>
                  {adminNavigationItems.map(renderAdminNavItem)}
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
