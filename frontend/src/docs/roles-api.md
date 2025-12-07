# Roles API - API lấy danh sách vai trò

## Tổng quan

Đã thêm API endpoint để lấy danh sách vai trò từ database, thay thế cho dữ liệu mock trước đây.

## Backend Changes

### 1. Thêm endpoint mới

```typescript
// backend/src/users/users.controller.ts
@Get('roles/list')
@UseGuards(JwtAuthGuard, AdminGuard)
async getRoles(
  @Req() request: Request & { user: AuthUser },
  @Res() response: Response
): Promise<void> {
  const result = await this.usersService.getRoles(request.user);
  ResponseHelper.success(response, result, 'Lấy danh sách vai trò thành công');
}
```

### 2. Service method

```typescript
// backend/src/users/users.service.ts
async getRoles(_currentUser: AuthUser) {
  const roles = await this.prisma.role.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      permissions: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return roles;
}
```

## Frontend Changes

### 1. Cập nhật UserService

```typescript
// frontend/src/services/user.service.ts
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

class UserService {
  async getRoles(): Promise<Role[]> {
    const response = await apiClient.get(`${this.baseUrl}/roles/list`);
    return response.data;
  }
}
```

### 2. Cập nhật admin-users-page.tsx

```typescript
// frontend/src/pages/admin-users-page.tsx
const loadRoles = useCallback(async () => {
  try {
    const rolesData = await userService.getRoles();
    setRoles(rolesData);
  } catch (error) {
    toast.error('Không thể tải danh sách vai trò');
  }
}, []);
```

### 3. Sửa UserForm - Ẩn switches khi edit

```typescript
// frontend/src/components/admin/user-management/user-form.tsx
{/* Status Switches - Only show for create mode */}
{!isEdit && (
  <div className="space-y-4">
    <FormField
      control={form.control}
      name="isActive"
      render={({ field }) => (
        <FormItem className="flex items-center justify-between">
          <FormLabel>Đang hoạt động</FormLabel>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />

    <FormField
      control={form.control}
      name="isVerified"
      render={({ field }) => (
        <FormItem className="flex items-center justify-between">
          <FormLabel>Đã xác thực</FormLabel>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  </div>
)}
```

## API Endpoints

### GET /users/roles/list

**Mô tả**: Lấy danh sách tất cả vai trò đang hoạt động

**Headers**:

```
Authorization: Bearer <admin_token>
```

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": "role_id_1",
      "name": "admin",
      "description": "Quản trị viên hệ thống",
      "permissions": ["manage_users", "manage_documents", "view_analytics"]
    },
    {
      "id": "role_id_2",
      "name": "user",
      "description": "Người dùng thông thường",
      "permissions": ["view_documents", "upload_documents"]
    }
  ],
  "message": "Lấy danh sách vai trò thành công"
}
```

## Lợi ích

### 1. Dữ liệu thực từ database

- Không còn sử dụng mock data
- Vai trò được quản lý từ database
- Dễ dàng thêm/sửa/xóa vai trò

### 2. Bảo mật

- Chỉ admin mới có thể truy cập API
- Sử dụng AdminGuard để bảo vệ

### 3. UX tốt hơn

- Ẩn switches không cần thiết khi edit user
- Chỉ hiển thị switches khi tạo user mới
- Load roles từ API thực tế

## Testing

### 1. Test API endpoint

```bash
curl -X GET "http://localhost:3000/users/roles/list" \
  -H "Authorization: Bearer <admin_token>"
```

### 2. Test với user thường

```bash
curl -X GET "http://localhost:3000/users/roles/list" \
  -H "Authorization: Bearer <user_token>"
# Kết quả: 403 Forbidden
```

## Kết luận

Việc thêm API roles và sửa user form đã cải thiện đáng kể trải nghiệm người dùng và tính chính xác của dữ liệu. Hệ thống giờ đây sử dụng dữ liệu thực từ database thay vì mock data.
