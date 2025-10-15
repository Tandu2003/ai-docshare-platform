import { Filter, Search, X } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { GetUsersQuery } from '@/services/user.service';

interface UserFiltersProps {
  filters: GetUsersQuery;
  onFiltersChange: (filters: GetUsersQuery) => void;
  onReset: () => void;
}

export function UserFilters({ filters, onFiltersChange, onReset }: UserFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value, page: 1 });
  };

  const handleRoleChange = (value: string) => {
    onFiltersChange({ ...filters, role: value === 'all' ? undefined : value, page: 1 });
  };

  const handleStatusChange = (value: string) => {
    let isActive: boolean | undefined;
    let isVerified: boolean | undefined;

    switch (value) {
      case 'active':
        isActive = true;
        break;
      case 'inactive':
        isActive = false;
        break;
      case 'verified':
        isVerified = true;
        break;
      case 'unverified':
        isVerified = false;
        break;
      default:
        isActive = undefined;
        isVerified = undefined;
    }

    onFiltersChange({ ...filters, isActive, isVerified, page: 1 });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-');
    onFiltersChange({
      ...filters,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      page: 1,
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.role) count++;
    if (typeof filters.isActive === 'boolean') count++;
    if (typeof filters.isVerified === 'boolean') count++;
    if (filters.sortBy !== 'createdAt' || filters.sortOrder !== 'desc') count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="flex items-center gap-2">
      {/* Search Input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm người dùng..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="mr-2 h-4 w-4" />
            Bộ lọc
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Bộ lọc</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={onReset}>
                  <X className="mr-2 h-4 w-4" />
                  Xóa bộ lọc
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {/* Role Filter */}
              <div>
                <label className="text-sm font-medium">Vai trò</label>
                <Select value={filters.role || 'all'} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả vai trò</SelectItem>
                    <SelectItem value="admin">Quản trị viên</SelectItem>
                    <SelectItem value="moderator">Điều hành viên</SelectItem>
                    <SelectItem value="user">Người dùng</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium">Trạng thái</label>
                <Select
                  value={
                    typeof filters.isActive === 'boolean'
                      ? filters.isActive
                        ? 'active'
                        : 'inactive'
                      : typeof filters.isVerified === 'boolean'
                        ? filters.isVerified
                          ? 'verified'
                          : 'unverified'
                        : 'all'
                  }
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="active">Đang hoạt động</SelectItem>
                    <SelectItem value="inactive">Không hoạt động</SelectItem>
                    <SelectItem value="verified">Đã xác thực</SelectItem>
                    <SelectItem value="unverified">Chưa xác thực</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="text-sm font-medium">Sắp xếp</label>
                <Select
                  value={`${filters.sortBy || 'createdAt'}-${filters.sortOrder || 'desc'}`}
                  onValueChange={handleSortChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn cách sắp xếp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt-desc">Mới nhất</SelectItem>
                    <SelectItem value="createdAt-asc">Cũ nhất</SelectItem>
                    <SelectItem value="updatedAt-desc">Cập nhật gần nhất</SelectItem>
                    <SelectItem value="updatedAt-asc">Cập nhật xa nhất</SelectItem>
                    <SelectItem value="lastLoginAt-desc">Đăng nhập gần nhất</SelectItem>
                    <SelectItem value="lastLoginAt-asc">Đăng nhập xa nhất</SelectItem>
                    <SelectItem value="firstName-asc">Tên A-Z</SelectItem>
                    <SelectItem value="firstName-desc">Tên Z-A</SelectItem>
                    <SelectItem value="email-asc">Email A-Z</SelectItem>
                    <SelectItem value="email-desc">Email Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
