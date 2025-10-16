import { useCallback, useEffect, useState } from 'react';

import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

import {
  UserFilters,
  UserForm,
  UserTable,
} from '@/components/admin/user-management';
import { LoadingSpinner } from '@/components/common';
import { UnauthorizedMessage } from '@/components/common/unauthorized-message';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks';
import { usePermissions } from '@/hooks/use-permissions';
import {
  userService,
  type CreateUserRequest,
  type GetUsersQuery,
  type Role,
  type UpdateUserRequest,
  type User,
} from '@/services/user.service';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { canRead, canCreate, canUpdate, canDelete } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [filters, setFilters] = useState<GetUsersQuery>({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Kiểm tra quyền truy cập
  if (!canRead('User')) {
    return (
      <div className="container mx-auto p-6">
        <UnauthorizedMessage
          title="Không có quyền quản lý người dùng"
          description="Bạn cần có quyền quản trị viên để truy cập trang này."
          action={{
            label: 'Quay lại trang chủ',
            onClick: () => window.history.back(),
          }}
        />
      </div>
    );
  }

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await userService.getUsers(filters);
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Load roles from API
  const loadRoles = useCallback(async () => {
    try {
      const rolesData = await userService.getRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Failed to load roles:', error);
      toast.error('Không thể tải danh sách vai trò');
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Handle filters change
  const handleFiltersChange = (newFilters: GetUsersQuery) => {
    setFilters(newFilters);
  };

  // Handle select user
  const handleSelectUser = (userId: string, selected: boolean) => {
    if (selected) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Handle create user
  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  // Handle edit user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  // Handle delete user
  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Handle form submit
  const handleFormSubmit = async (
    data: CreateUserRequest | UpdateUserRequest,
  ) => {
    try {
      if (selectedUser) {
        // Update user
        await userService.updateUser(
          selectedUser.id,
          data as UpdateUserRequest,
        );
        toast.success('Cập nhật người dùng thành công');
      } else {
        // Create user
        await userService.createUser(data as CreateUserRequest);
        toast.success('Tạo người dùng thành công');
      }
      setIsFormOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
      toast.error('Không thể lưu người dùng');
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      await userService.deleteUser(selectedUser.id);
      toast.success('Xóa người dùng thành công');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Không thể xóa người dùng');
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;

    try {
      await Promise.all(selectedUsers.map(id => userService.deleteUser(id)));
      toast.success(`Đã xóa ${selectedUsers.length} người dùng`);
      setSelectedUsers([]);
      await loadUsers();
    } catch (error) {
      console.error('Failed to delete users:', error);
      toast.error('Không thể xóa người dùng');
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Users className="text-primary h-8 w-8" />
            Quản lý người dùng
          </h1>
          <p className="text-muted-foreground">
            Quản lý người dùng, vai trò và quyền hạn trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedUsers.length > 0 && canDelete('User') && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa ({selectedUsers.length})
            </Button>
          )}
          {canCreate('User') && (
            <Button onClick={handleCreateUser} disabled={isLoading}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm người dùng
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Tổng người dùng
                </p>
                <p className="text-2xl font-bold">{pagination.total}</p>
              </div>
              <Users className="text-muted-foreground h-8 w-8" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Người dùng hoạt động
                </p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.isActive).length}
                </p>
              </div>
              <Badge
                variant="default"
                className="flex h-8 w-8 items-center justify-center"
              >
                ✓
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Đã xác thực
                </p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.isVerified).length}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="flex h-8 w-8 items-center justify-center"
              >
                ✓
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Quản trị viên
                </p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role.name === 'admin').length}
                </p>
              </div>
              <Badge
                variant="destructive"
                className="flex h-8 w-8 items-center justify-center"
              >
                A
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc và tìm kiếm</CardTitle>
        </CardHeader>
        <CardContent>
          <UserFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleResetFilters}
          />
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách người dùng ({pagination.total})</CardTitle>
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  Đã chọn {selectedUsers.length} người dùng
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUsers([])}
                >
                  Bỏ chọn
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <UserTable
              users={users}
              selectedUsers={selectedUsers}
              onSelectUser={handleSelectUser}
              onSelectAll={handleSelectAll}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)}{' '}
            trong tổng số {pagination.total} người dùng
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilters({ ...filters, page: pagination.page - 1 })
              }
              disabled={!pagination.hasPrev}
            >
              Trước
            </Button>
            <span className="text-sm">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilters({ ...filters, page: pagination.page + 1 })
              }
              disabled={!pagination.hasNext}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* User Form Dialog */}
      <UserForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleFormSubmit}
        user={selectedUser}
        roles={roles}
        isLoading={isLoading}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa người dùng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa người dùng "{selectedUser?.firstName}{' '}
              {selectedUser?.lastName}"? Hành động này không thể hoàn tác và sẽ
              xóa tất cả dữ liệu liên quan đến người dùng này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
