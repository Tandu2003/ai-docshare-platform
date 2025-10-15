# User Management System

## Tổng quan

Hệ thống quản lý người dùng cho phép quản trị viên thực hiện các thao tác CRUD (Create, Read, Update, Delete) trên người dùng trong hệ thống AI DocShare Platform.

## Tính năng chính

### 1. Quản lý người dùng

- **Xem danh sách người dùng**: Hiển thị tất cả người dùng với thông tin chi tiết
- **Tìm kiếm và lọc**: Tìm kiếm theo tên, email, username và lọc theo vai trò, trạng thái
- **Sắp xếp**: Sắp xếp theo các tiêu chí khác nhau (ngày tạo, cập nhật, đăng nhập cuối, tên, email)
- **Phân trang**: Hiển thị danh sách người dùng theo trang

### 2. Thao tác CRUD

- **Tạo người dùng mới**: Thêm người dùng mới với đầy đủ thông tin
- **Chỉnh sửa người dùng**: Cập nhật thông tin người dùng hiện có
- **Xóa người dùng**: Xóa người dùng khỏi hệ thống
- **Xem chi tiết**: Xem thông tin chi tiết của người dùng

### 3. Quản lý vai trò và trạng thái

- **Thay đổi vai trò**: Cập nhật vai trò của người dùng (admin, moderator, user)
- **Quản lý trạng thái**: Kích hoạt/vô hiệu hóa tài khoản người dùng
- **Xác thực email**: Quản lý trạng thái xác thực email

### 4. Thống kê và báo cáo

- **Thống kê tổng quan**: Số lượng người dùng, người dùng hoạt động, đã xác thực
- **Hoạt động người dùng**: Xem lịch sử hoạt động của người dùng
- **Thống kê cá nhân**: Số lượng tài liệu, lượt tải, lượt xem của từng người dùng

## Cấu trúc API

### Backend Endpoints

#### 1. Lấy danh sách người dùng

```
GET /users
Query Parameters:
- page: Số trang (mặc định: 1)
- limit: Số lượng item mỗi trang (mặc định: 10)
- search: Tìm kiếm theo tên, email, username
- role: Lọc theo vai trò
- isActive: Lọc theo trạng thái hoạt động
- isVerified: Lọc theo trạng thái xác thực
- sortBy: Trường sắp xếp
- sortOrder: Thứ tự sắp xếp (asc/desc)
```

#### 2. Lấy thông tin người dùng

```
GET /users/:id
```

#### 3. Tạo người dùng mới

```
POST /users
Body: CreateUserRequest
```

#### 4. Cập nhật người dùng

```
PATCH /users/:id
Body: UpdateUserRequest
```

#### 5. Cập nhật vai trò

```
PATCH /users/:id/role
Body: UpdateUserRoleRequest
```

#### 6. Cập nhật trạng thái

```
PATCH /users/:id/status
Body: UpdateUserStatusRequest
```

#### 7. Xóa người dùng

```
DELETE /users/:id
```

#### 8. Lấy hoạt động người dùng

```
GET /users/:id/activity
Query Parameters:
- page: Số trang
- limit: Số lượng item mỗi trang
```

#### 9. Lấy thống kê người dùng

```
GET /users/:id/statistics
```

### Frontend Components

#### 1. UserTable

- Hiển thị danh sách người dùng dạng bảng
- Hỗ trợ chọn nhiều người dùng
- Các hành động: xem, chỉnh sửa, xóa, thay đổi vai trò, trạng thái

#### 2. UserFilters

- Bộ lọc tìm kiếm và sắp xếp
- Lọc theo vai trò, trạng thái
- Tìm kiếm theo tên, email, username

#### 3. UserForm

- Form tạo/chỉnh sửa người dùng
- Validation đầy đủ
- Hỗ trợ upload ảnh đại diện

## Phân quyền

### Quyền truy cập

- **Chỉ quản trị viên (admin)** mới có thể truy cập trang quản lý người dùng
- **User thường** không thể truy cập trang này

### Bảo mật

- Tất cả API endpoints đều yêu cầu authentication
- Kiểm tra quyền admin trước khi thực hiện các thao tác
- Không cho phép xóa chính mình
- Hash password trước khi lưu vào database

## Cách sử dụng

### 1. Truy cập trang quản lý

- Đăng nhập với tài khoản admin
- Truy cập `/admin/users`

### 2. Tìm kiếm người dùng

- Sử dụng ô tìm kiếm để tìm theo tên, email, username
- Sử dụng bộ lọc để lọc theo vai trò, trạng thái

### 3. Tạo người dùng mới

- Click nút "Thêm người dùng"
- Điền đầy đủ thông tin bắt buộc
- Chọn vai trò phù hợp
- Click "Tạo mới"

### 4. Chỉnh sửa người dùng

- Click vào menu 3 chấm của người dùng
- Chọn "Chỉnh sửa"
- Cập nhật thông tin cần thiết
- Click "Cập nhật"

### 5. Xóa người dùng

- Click vào menu 3 chấm của người dùng
- Chọn "Xóa"
- Xác nhận xóa trong dialog

### 6. Thay đổi vai trò

- Click vào menu 3 chấm của người dùng
- Chọn "Thay đổi vai trò"
- Chọn vai trò mới

### 7. Quản lý trạng thái

- Click vào menu 3 chấm của người dùng
- Chọn "Kích hoạt" hoặc "Vô hiệu hóa"

## Lưu ý

1. **Backup dữ liệu**: Luôn backup dữ liệu trước khi thực hiện các thao tác quan trọng
2. **Kiểm tra quyền**: Đảm bảo chỉ admin mới có thể truy cập
3. **Validation**: Tất cả input đều được validate ở cả frontend và backend
4. **Error handling**: Xử lý lỗi một cách graceful
5. **Performance**: Sử dụng pagination để tối ưu hiệu suất

## Mở rộng

### Thêm tính năng mới

1. **Bulk operations**: Thực hiện hành động trên nhiều người dùng cùng lúc
2. **Export/Import**: Xuất/nhập danh sách người dùng
3. **Advanced filters**: Bộ lọc nâng cao với nhiều tiêu chí
4. **User groups**: Quản lý nhóm người dùng
5. **Audit log**: Ghi log tất cả thao tác quản lý

### Tối ưu hiệu suất

1. **Caching**: Cache danh sách người dùng
2. **Lazy loading**: Tải dữ liệu theo yêu cầu
3. **Search optimization**: Tối ưu tìm kiếm với full-text search
4. **Database indexing**: Tạo index cho các trường thường xuyên tìm kiếm
