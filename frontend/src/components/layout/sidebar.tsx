import {
  Archive,
  BarChart3,
  Bell,
  Bookmark,
  ChevronDown,
  FileText,
  FolderOpen,
  Home,
  LogOut,
  Settings,
  Shield,
  Star,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks'
import { cn } from '@/lib/utils'
import {
  BOOKMARKS_UPDATED_EVENT,
  BookmarkStats,
  getBookmarkStats,
} from '@/services/bookmark.service'

interface SidebarProps {
  className?: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [bookmarkStats, setBookmarkStats] = useState<BookmarkStats | null>(null);

  const loadBookmarkStats = useCallback(async () => {
    if (!user) {
      setBookmarkStats(null);
      return;
    }

    try {
      const stats = await getBookmarkStats();
      setBookmarkStats(stats);
    } catch (error) {
      console.error('Failed to load bookmark stats', error);
    }
  }, [user]);

  useEffect(() => {
    void loadBookmarkStats();
  }, [loadBookmarkStats]);

  useEffect(() => {
    const handleUpdated = () => {
      void loadBookmarkStats();
    };

    window.addEventListener(BOOKMARKS_UPDATED_EVENT, handleUpdated);
    return () => window.removeEventListener(BOOKMARKS_UPDATED_EVENT, handleUpdated);
  }, [loadBookmarkStats]);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const mainNavItems: NavItem[] = [
    {
      title: 'Bảng điều khiển',
      href: '/dashboard',
      icon: Home,
    },
    {
      title: 'Tài liệu',
      href: '/documents',
      icon: FileText,
    },
    {
      title: 'Tải lên',
      href: '/upload',
      icon: Upload,
    },
    {
      title: 'Danh mục',
      href: '/categories',
      icon: FolderOpen,
    },
  ];

  const userNavItems: NavItem[] = [
    {
      title: 'Đánh dấu',
      href: '/bookmarks',
      icon: Bookmark,
      badge: bookmarkStats?.total,
    },
    {
      title: 'Thông báo',
      href: '/notifications',
      icon: Bell,
      badge: 3,
    },
    {
      title: 'Tài liệu của tôi',
      href: '/my-documents',
      icon: Archive,
    },
  ];

  const analyticsNavItems: NavItem[] = [
    {
      title: 'Phân tích',
      href: '/analytics',
      icon: BarChart3,
    },
    {
      title: 'Xu hướng',
      href: '/trending',
      icon: TrendingUp,
    },
    {
      title: 'Được đánh giá cao',
      href: '/top-rated',
      icon: Star,
    },
  ];

  const adminNavItems: NavItem[] = [
    {
      title: 'Bảng điều khiển quản trị',
      href: '/admin',
      icon: Shield,
    },
    {
      title: 'Quản lý người dùng',
      href: '/admin/users',
      icon: Users,
    },
  ];

  const renderNavItem = (item: NavItem) => (
    <Button
      key={item.href}
      variant={isActive(item.href) ? 'secondary' : 'ghost'}
      className={cn(
        'w-full justify-start h-10 px-3',
        isActive(item.href) && 'bg-secondary text-secondary-foreground'
      )}
      asChild
    >
      <Link to={item.href} className="flex items-center gap-3">
        <item.icon className="h-4 w-4" />
        <span className="flex-1 text-left">{item.title}</span>
        {typeof item.badge === 'number' && item.badge > 0 ? (
          <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
            {item.badge}
          </Badge>
        ) : null}
      </Link>
    </Button>
  );

  const renderNavSection = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h4>
      <div className="space-y-1">{items.map(renderNavItem)}</div>
    </div>
  );

  return (
    <div className={cn('flex h-full w-64 flex-col border-r bg-background', className)}>
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/dashboard" className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">AI DocShare</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-6">
          {renderNavSection('Chính', mainNavItems)}
          <Separator />
          {renderNavSection('Cá nhân', userNavItems)}
          <Separator />
          {renderNavSection('Phân tích', analyticsNavItems)}
          {user?.role?.name === 'admin' && (
            <>
              <Separator />
              {renderNavSection('Quản trị', adminNavItems)}
            </>
          )}
        </div>
      </ScrollArea>

      {/* User Info */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2 h-auto">
              <div className="flex items-center gap-3 w-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {user?.firstName?.charAt(0)}
                    {user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Hồ sơ
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Cài đặt
              </Link>
            </DropdownMenuItem>
            {user?.role?.name === 'admin' && (
              <DropdownMenuItem asChild>
                <Link to="/admin/settings" className="flex items-center">
                  <Shield className="mr-2 h-4 w-4" />
                  Cài đặt hệ thống
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onSelect={(e) => e.preventDefault()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận đăng xuất</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc chắn muốn đăng xuất? Bạn sẽ cần đăng nhập lại để tiếp tục.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Đăng xuất
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
