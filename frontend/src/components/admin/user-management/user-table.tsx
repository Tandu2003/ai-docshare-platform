import { useState } from 'react';

import { Coins, Edit, MoreHorizontal, Trash2, Undo2 } from 'lucide-react';

import { AdminOnly } from '@/components/common/permission-gate';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { User } from '@/services/user.service';
import { formatDate } from '@/utils/date';

interface UserTableProps {
  users: User[];
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onUnDeleteUser: (user: User) => void;
  onAdjustPoints?: (user: User) => void;
  isLoading?: boolean;
}

export function UserTable({
  users,
  onEditUser,
  onDeleteUser,
  onUnDeleteUser,
  onAdjustPoints,
  isLoading = false,
}: UserTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName) {
      case 'admin':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (
    isActive: boolean,
    isVerified: boolean,
    isDeleted: boolean,
  ) => {
    if (isDeleted) return 'destructive';
    if (!isActive) return 'destructive';
    if (!isVerified) return 'secondary';
    return 'default';
  };

  const getStatusText = (
    isActive: boolean,
    isVerified: boolean,
    isDeleted: boolean,
  ) => {
    if (isDeleted) return 'Đã xóa';
    if (!isActive) return 'Không hoạt động';
    if (!isVerified) return 'Chưa xác thực';
    return 'Hoạt động';
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Người dùng</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Thống kê</TableHead>
            <TableHead>Đăng nhập cuối</TableHead>
            <TableHead>Ngày tạo</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow
              key={user.id}
              className={`cursor-pointer transition-colors ${
                hoveredRow === user.id ? 'bg-muted/50' : ''
              }`}
              onMouseEnter={() => setHoveredRow(user.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={`${user.firstName} ${user.lastName}`}
                      />
                    ) : (
                      <AvatarFallback className="text-xs">
                        {getInitials(user.firstName, user.lastName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex flex-col">
                    <div className="font-medium">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {user.email}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      @{user.username}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(user.role.name)}>
                  {user.role.name}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={getStatusBadgeVariant(
                    user.isActive,
                    user.isVerified,
                    user.isDeleted,
                  )}
                >
                  {getStatusText(
                    user.isActive,
                    user.isVerified,
                    user.isDeleted,
                  )}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-muted-foreground text-sm">
                  <div>{user._count?.documents || 0} tài liệu</div>
                  <div>{user._count?.downloads || 0} lượt tải</div>
                  <div className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-amber-600" />
                    <span>{user.pointsBalance ?? 0} điểm</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-muted-foreground text-sm">
                  {user.lastLoginAt
                    ? formatDate(user.lastLoginAt)
                    : 'Chưa đăng nhập'}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-muted-foreground text-sm">
                  {formatDate(user.createdAt)}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <AdminOnly>
                      <DropdownMenuItem onClick={() => onEditUser(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                    </AdminOnly>
                    {onAdjustPoints && (
                      <AdminOnly>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onAdjustPoints(user)}>
                          <Coins className="mr-2 h-4 w-4" />
                          Điều chỉnh điểm
                        </DropdownMenuItem>
                      </AdminOnly>
                    )}
                    <AdminOnly>
                      <DropdownMenuSeparator />
                      {user.isDeleted ? (
                        <DropdownMenuItem
                          onClick={() => onUnDeleteUser(user)}
                          className="text-green-600 focus:text-green-600"
                        >
                          <Undo2 className="mr-2 h-4 w-4" />
                          Khôi phục
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onDeleteUser(user)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa
                        </DropdownMenuItem>
                      )}
                    </AdminOnly>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {users.length === 0 && !isLoading && (
        <div className="text-muted-foreground flex items-center justify-center py-8">
          Không có người dùng nào
        </div>
      )}
    </div>
  );
}
