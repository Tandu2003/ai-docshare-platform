# Hướng dẫn sử dụng hệ thống phân quyền

## Tổng quan

Hệ thống phân quyền sử dụng CASL (Code Access Security Library) để quản lý quyền truy cập dựa trên vai trò (roles) và hành động (actions). Hệ thống hiện tại hỗ trợ 2 vai trò chính:

- **admin**: Có toàn quyền quản lý hệ thống
- **user**: Có quyền hạn cơ bản để sử dụng các tính năng

## Cấu trúc phân quyền

### Actions (Hành động)
- `create`: Tạo mới
- `read`: Đọc/xem
- `update`: Cập nhật
- `delete`: Xóa
- `manage`: Quản lý toàn bộ
- `upload`: Tải lên
- `download`: Tải xuống
- `share`: Chia sẻ
- `comment`: Bình luận
- `rate`: Đánh giá
- `bookmark`: Đánh dấu

### Subjects (Đối tượng)
- `User`: Người dùng
- `Document`: Tài liệu
- `File`: Tệp tin
- `Category`: Danh mục
- `Comment`: Bình luận
- `Rating`: Đánh giá
- `Bookmark`: Đánh dấu
- `Notification`: Thông báo
- `SystemSetting`: Cài đặt hệ thống
- `all`: Tất cả

## Quyền hạn theo vai trò

### Admin
- Có toàn quyền (`manage: all`)
- Có thể thực hiện tất cả hành động trên tất cả đối tượng
- Có thể truy cập trang quản trị
- Có thể quản lý người dùng
- Có thể xem thống kê hệ thống

### User
- **Documents**: 
  - Đọc tài liệu public đã được duyệt
  - Đọc tài liệu của chính mình
  - Tạo, cập nhật, xóa tài liệu của chính mình
  - Tải xuống tài liệu public hoặc của chính mình
  - Chia sẻ tài liệu của chính mình
- **Files**: 
  - Tải lên tệp tin
  - Đọc tệp tin public
  - Đọc tệp tin của chính mình
- **Comments**: 
  - Tạo bình luận
  - Cập nhật, xóa bình luận của chính mình
- **Ratings**: 
  - Tạo, cập nhật đánh giá
- **Bookmarks**: 
  - Tạo, đọc, xóa đánh dấu của chính mình
- **Notifications**: 
  - Đọc, cập nhật, xóa thông báo của chính mình
- **User**: 
  - Đọc, cập nhật thông tin của chính mình

## Sử dụng trong Backend

### 1. Decorators

```typescript
import { CheckPolicy, AdminOnly, Roles } from '@/common/casl';

@Controller('users')
@UseGuards(JwtAuthGuard, CaslGuard)
export class UsersController {
  @Get()
  @AdminOnly()
  @CheckPolicy({ action: 'read', subject: 'User' })
  async getUsers() {
    // Chỉ admin mới có thể truy cập
  }

  @Post()
  @Roles('admin', 'user')
  @CheckPolicy({ action: 'create', subject: 'Document' })
  async createDocument() {
    // Admin và user đều có thể tạo document
  }
}
```

### 2. Guards

```typescript
// Sử dụng CaslGuard cho kiểm tra permissions
@UseGuards(JwtAuthGuard, CaslGuard)

// Sử dụng RoleGuard cho kiểm tra roles
@UseGuards(JwtAuthGuard, RoleGuard)
```

### 3. Kiểm tra quyền trong service

```typescript
import { AbilityFactory } from '@/common/casl';

@Injectable()
export class DocumentService {
  constructor(private abilityFactory: AbilityFactory) {}

  async deleteDocument(documentId: string, user: any) {
    const ability = this.abilityFactory.createForUser(user);
    
    if (!ability.can('delete', 'Document', { uploaderId: user.id })) {
      throw new ForbiddenException('Không có quyền xóa tài liệu này');
    }
    
    // Thực hiện xóa document
  }
}
```

## Sử dụng trong Frontend

### 1. Hooks

```typescript
import { usePermissions } from '@/hooks/use-permissions';

function MyComponent() {
  const { 
    canRead, 
    canCreate, 
    canUpdate, 
    canDelete,
    isAdmin,
    canViewDocument,
    canEditDocument 
  } = usePermissions();

  // Kiểm tra quyền cơ bản
  if (canRead('Document')) {
    // Hiển thị danh sách documents
  }

  // Kiểm tra quyền với điều kiện
  if (canViewDocument(document)) {
    // Hiển thị document
  }

  // Kiểm tra vai trò
  if (isAdmin()) {
    // Hiển thị admin features
  }
}
```

### 2. Permission Gates

```typescript
import { 
  PermissionGate, 
  AdminOnly, 
  DocumentPermissionGate 
} from '@/components/common/permission-gate';

function DocumentCard({ document }) {
  return (
    <div>
      <h3>{document.title}</h3>
      
      {/* Chỉ hiển thị nút download nếu có quyền */}
      <DocumentPermissionGate 
        document={document} 
        action="download"
      >
        <Button>Download</Button>
      </DocumentPermissionGate>

      {/* Chỉ admin mới thấy nút xóa */}
      <AdminOnly>
        <Button variant="destructive">Delete</Button>
      </AdminOnly>
    </div>
  );
}
```

### 3. Protected Routes

```typescript
import { ProtectedRoute } from '@/components/layout/protected-route';

function App() {
  return (
    <Routes>
      {/* Yêu cầu đăng nhập */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />

      {/* Yêu cầu quyền cụ thể */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute
            requiredPermissions={[
              { action: 'read', subject: 'User' }
            ]}
          >
            <AdminPage />
          </ProtectedRoute>
        } 
      />

      {/* Yêu cầu vai trò */}
      <Route 
        path="/admin/users" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminUsersPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}
```

## Các component có sẵn

### Permission Gates
- `PermissionGate`: Kiểm tra quyền cơ bản
- `RoleGate`: Kiểm tra vai trò
- `AdminOnly`: Chỉ hiển thị cho admin
- `UserOnly`: Chỉ hiển thị cho user
- `DocumentPermissionGate`: Kiểm tra quyền với document
- `CommentPermissionGate`: Kiểm tra quyền với comment
- `BookmarkPermissionGate`: Kiểm tra quyền với bookmark

### Utility Components
- `UnauthorizedMessage`: Hiển thị thông báo không có quyền
- `ProtectedRoute`: Bảo vệ routes

## Best Practices

### 1. Backend
- Luôn sử dụng `@CheckPolicy` decorator cho các endpoints quan trọng
- Sử dụng `CaslGuard` để tự động kiểm tra permissions
- Kiểm tra quyền trong service layer khi cần thiết
- Sử dụng conditions để kiểm tra quyền dựa trên dữ liệu

### 2. Frontend
- Sử dụng `usePermissions` hook thay vì kiểm tra role trực tiếp
- Sử dụng Permission Gates để conditional rendering
- Luôn có fallback UI khi user không có quyền
- Sử dụng `ProtectedRoute` cho các trang quan trọng

### 3. Security
- Không bao giờ tin tưởng frontend permissions
- Luôn validate permissions ở backend
- Sử dụng conditions để đảm bảo user chỉ có thể thao tác với dữ liệu của mình
- Log các hoạt động quan trọng để audit

## Ví dụ thực tế

### Tạo document mới
```typescript
// Backend
@Post('documents')
@CheckPolicy({ action: 'create', subject: 'Document' })
async createDocument(@Body() dto: CreateDocumentDto, @Req() req) {
  // User có thể tạo document
}

// Frontend
function CreateDocumentButton() {
  const { canCreate } = usePermissions();
  
  if (!canCreate('Document')) {
    return null; // Không hiển thị nút
  }
  
  return <Button onClick={createDocument}>Tạo tài liệu</Button>;
}
```

### Xóa document
```typescript
// Backend
@Delete('documents/:id')
@CheckPolicy({ action: 'delete', subject: 'Document' })
async deleteDocument(@Param('id') id: string, @Req() req) {
  // Kiểm tra thêm trong service
  const document = await this.documentService.findById(id);
  if (document.uploaderId !== req.user.id && req.user.role.name !== 'admin') {
    throw new ForbiddenException('Không có quyền xóa tài liệu này');
  }
}

// Frontend
function DocumentActions({ document }) {
  const { canDeleteDocument } = usePermissions();
  
  return (
    <DocumentPermissionGate document={document} action="delete">
      <Button variant="destructive">Xóa</Button>
    </DocumentPermissionGate>
  );
}
```

Hệ thống phân quyền này đảm bảo tính bảo mật và dễ sử dụng, cho phép kiểm soát chặt chẽ quyền truy cập của người dùng trong ứng dụng.