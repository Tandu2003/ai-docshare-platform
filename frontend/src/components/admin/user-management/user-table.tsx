import { Activity, Edit, Eye, MoreHorizontal, Shield, Trash2, UserCheck, UserX } from 'lucide-react'
import { useState } from 'react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/utils/date'

import type { User } from '@/services/user.service';
interface UserTableProps {
  users: User[];
  selectedUsers: string[];
  onSelectUser: (userId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onViewUser: (user: User) => void;
  onViewActivity: (user: User) => void;
  onUpdateUserRole: (user: User) => void;
  onUpdateUserStatus: (user: User) => void;
  isLoading?: boolean;
}

export function UserTable({
  users,
  selectedUsers,
  onSelectUser,
  onSelectAll,
  onEditUser,
  onDeleteUser,
  onViewUser,
  onViewActivity,
  onUpdateUserRole,
  onUpdateUserStatus,
  isLoading = false,
}: UserTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const allSelected = users.length > 0 && selectedUsers.length === users.length;

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (isActive: boolean, isVerified: boolean) => {
    if (!isActive) return 'destructive';
    if (!isVerified) return 'secondary';
    return 'default';
  };

  const getStatusText = (isActive: boolean, isVerified: boolean) => {
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
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                aria-label="Chọn tất cả"
              />
            </TableHead>
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
          {users.map((user) => (
            <TableRow
              key={user.id}
              className={`cursor-pointer transition-colors ${
                hoveredRow === user.id ? 'bg-muted/50' : ''
              }`}
              onMouseEnter={() => setHoveredRow(user.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <TableCell>
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={(checked) => onSelectUser(user.id, checked as boolean)}
                  aria-label={`Chọn ${user.firstName} ${user.lastName}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {user.avatar ? (
                      <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
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
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <div className="text-xs text-muted-foreground">@{user.username}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(user.role.name)}>{user.role.name}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(user.isActive, user.isVerified)}>
                  {getStatusText(user.isActive, user.isVerified)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  <div>{user._count?.documents || 0} tài liệu</div>
                  <div>{user._count?.downloads || 0} lượt tải</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Chưa đăng nhập'}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</div>
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
                    <DropdownMenuItem onClick={() => onViewUser(user)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Xem chi tiết
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewActivity(user)}>
                      <Activity className="mr-2 h-4 w-4" />
                      Hoạt động
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditUser(user)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onUpdateUserRole(user)}>
                      <Shield className="mr-2 h-4 w-4" />
                      Thay đổi vai trò
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateUserStatus(user)}>
                      {user.isActive ? (
                        <UserX className="mr-2 h-4 w-4" />
                      ) : (
                        <UserCheck className="mr-2 h-4 w-4" />
                      )}
                      {user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteUser(user)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {users.length === 0 && !isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          Không có người dùng nào
        </div>
      )}
    </div>
  );
}
