# API Security - Bảo vệ API chỉ cho Admin

## Tổng quan

Tất cả các API endpoints trong module Users đã được bảo vệ để chỉ cho phép admin truy cập. Điều này đảm bảo rằng chỉ có quản trị viên mới có thể thực hiện các thao tác quản lý người dùng.

## Cách thức bảo vệ

### 1. AdminGuard

Tạo một guard riêng để kiểm tra quyền admin:

```typescript
// backend/src/auth/guards/admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user) {
      throw new ForbiddenException('Người dùng chưa đăng nhập');
    }

    if (user.role.name !== 'admin') {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập tính năng này. Chỉ quản trị viên mới có thể thực hiện thao tác này.'
      );
    }

    return true;
  }
}
```

### 2. Áp dụng Guard cho tất cả endpoints

Tất cả các endpoints trong UsersController đều được bảo vệ bằng cả `JwtAuthGuard` và `AdminGuard`:

```typescript
@Controller('users')
export class UsersController {
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUsers() { ... }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserById() { ... }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createUser() { ... }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateUser() { ... }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateUserRole() { ... }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateUserStatus() { ... }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteUser() { ... }

  @Get(':id/activity')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserActivity() { ... }

  @Get(':id/statistics')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserStatistics() { ... }
}
```

## Các endpoint được bảo vệ

### 1. Quản lý người dùng cơ bản

- `GET /users` - Lấy danh sách người dùng
- `GET /users/:id` - Lấy thông tin người dùng
- `POST /users` - Tạo người dùng mới
- `PATCH /users/:id` - Cập nhật thông tin người dùng
- `DELETE /users/:id` - Xóa người dùng

### 2. Quản lý vai trò và trạng thái

- `PATCH /users/:id/role` - Thay đổi vai trò người dùng
- `PATCH /users/:id/status` - Thay đổi trạng thái người dùng

### 3. Thống kê và hoạt động

- `GET /users/:id/activity` - Lấy hoạt động người dùng
- `GET /users/:id/statistics` - Lấy thống kê người dùng

## Xử lý lỗi

### 1. Người dùng chưa đăng nhập

```json
{
  "statusCode": 403,
  "message": "Người dùng chưa đăng nhập",
  "error": "Forbidden"
}
```

### 2. Không có quyền admin

```json
{
  "statusCode": 403,
  "message": "Bạn không có quyền truy cập tính năng này. Chỉ quản trị viên mới có thể thực hiện thao tác này.",
  "error": "Forbidden"
}
```

## Frontend Integration

Frontend đã được cập nhật để xử lý các lỗi bảo mật:

### 1. Kiểm tra quyền truy cập

```typescript
// AdminUsersPage.tsx
if (user?.role?.name !== 'admin') {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-2">Truy cập bị từ chối</h2>
      <p className="text-muted-foreground">
        Bạn không có quyền truy cập trang quản lý người dùng. Chỉ quản trị viên mới có thể sử dụng tính năng này.
      </p>
    </div>
  );
}
```

### 2. Xử lý lỗi API

```typescript
// user.service.ts
try {
  const response = await apiClient.get<ApiResponse<PaginationResponse<User>>>(BASE_URL, {
    params: query,
  });
  return response.data.data;
} catch (error) {
  if (error.response?.status === 403) {
    throw new Error('Bạn không có quyền truy cập tính năng này');
  }
  throw error;
}
```

## Lợi ích

### 1. Bảo mật cao

- Chỉ admin mới có thể truy cập các API quản lý người dùng
- Ngăn chặn việc truy cập trái phép từ người dùng thường

### 2. Kiểm soát quyền hạn

- Phân quyền rõ ràng giữa admin và user
- Dễ dàng mở rộng thêm các role khác

### 3. Trải nghiệm người dùng tốt

- Thông báo lỗi rõ ràng
- Giao diện thân thiện cho admin

## Testing

### 1. Test với user thường

```bash
# Đăng nhập với user thường
curl -X GET "http://localhost:3000/users" \
  -H "Authorization: Bearer <user_token>"

# Kết quả: 403 Forbidden
```

### 2. Test với admin

```bash
# Đăng nhập với admin
curl -X GET "http://localhost:3000/users" \
  -H "Authorization: Bearer <admin_token>"

# Kết quả: 200 OK với danh sách người dùng
```

## Kết luận

Việc bảo vệ API chỉ cho admin đảm bảo tính bảo mật cao cho hệ thống quản lý người dùng. Tất cả các endpoints đều được bảo vệ bằng guard và có xử lý lỗi phù hợp.
