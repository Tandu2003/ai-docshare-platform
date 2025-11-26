# Hướng dẫn phân quyền đơn giản (RBAC)

Hệ thống hiện tại chỉ sử dụng 2 vai trò: `admin` và `user`. Việc kiểm tra quyền giờ đây dựa hoàn toàn vào vai trò và ownership (quyền sở hữu dữ liệu).

## 1. Vai trò (Roles)

- `admin`: Toàn quyền trên hệ thống.
- `user`: Quyền thao tác trên dữ liệu của chính mình và truy cập nội dung công khai đã được duyệt.

## 2. Nguyên tắc chính

1. Mỗi request cần JWT hợp lệ (trừ các endpoint public).
2. Các endpoint quản trị (bắt đầu bằng `/admin` hoặc liên quan cài đặt hệ thống) yêu cầu vai trò `admin` thông qua `@AdminOnly()` và `RoleGuard`.
3. Các thao tác tạo/cập nhật/xóa ở tài nguyên thuộc về người dùng phải kiểm tra `uploaderId === user.id` hoặc `userId === user.id` trong service.
4. Frontend chỉ dùng logic hiển thị (UI gating); backend luôn là nguồn sự thật.

## 3. Backend Usage

### Decorators & Guards

```typescript
import { AdminOnly, Roles } from '@/common/authorization';
import { RoleGuard } from '@/common/authorization';
import { JwtAuthGuard } from '@/auth/guards';

@Controller('users')
@UseGuards(JwtAuthGuard, RoleGuard)
export class UsersController {
  @Get()
  @AdminOnly()
  async getUsers() {
    /* ... */
  }
}
```

### Ví dụ kiểm tra ownership trong service

```typescript
async deleteDocument(id: string, userId: string) {
  const doc = await this.prisma.document.findUnique({ where: { id } });
  if (!doc) throw new NotFoundException('Document không tồn tại');
  if (doc.uploaderId !== userId) throw new ForbiddenException('Không có quyền');
  await this.prisma.document.delete({ where: { id } });
}
```

## 4. Frontend Usage

### Hook `usePermissions`

Không còn `can(action, subject)` tổng quát. Thay vào đó là các hàm tiện ích:

```typescript
const {
  isAdmin,
  canViewDocument,
  canEditDocument,
  canDeleteDocument,
  canDownloadDocument,
  canShareDocument,
  canEditComment,
  canDeleteComment,
} = usePermissions();
```

### Ví dụ UI

```tsx
{
  isAdmin() && <AdminPanel />;
}
{
  canEditDocument(document) && <Button>Sửa</Button>;
}
{
  canDeleteComment(comment) && (
    <Button variant="destructive">Xóa bình luận</Button>
  );
}
```

## 5. Quyền chi tiết theo vai trò

### Admin

| Tài nguyên | Quyền                                                      |
| ---------- | ---------------------------------------------------------- |
| Tất cả     | Toàn quyền (đọc / tạo / cập nhật / xóa / duyệt / cấu hình) |

### User

| Tài nguyên   | Quyền                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------- |
| Document     | Tạo mới; đọc public + approved; đọc/cập nhật/xóa/chia sẻ của mình; tải xuống public hoặc của mình |
| File         | Tải lên; đọc file thuộc document mà họ được phép xem                                              |
| Comment      | Tạo; sửa/xóa của mình; xem tất cả comment thuộc document được phép                                |
| Rating       | Tạo/cập nhật đánh giá của mình                                                                    |
| Bookmark     | Tạo/xóa/xem của mình                                                                              |
| Notification | Đọc/cập nhật/xóa của mình                                                                         |
| User         | Đọc/cập nhật hồ sơ của mình                                                                       |

## 6. Best Practices

1. Luôn kiểm tra role ở controller cho các route admin.
2. Luôn kiểm tra ownership trong service (đừng tin dữ liệu từ client).
3. Log các hành động nhạy cảm (xóa, duyệt, cấu hình hệ thống).
4. Giữ UI đơn giản: phân nhánh theo `isAdmin()` và các helper khác.
5. Không để lộ thao tác admin ở frontend nếu không phải admin.

## 7. Mở rộng trong tương lai

Nếu sau này cần nhiều vai trò/phân quyền phức tạp hơn: có thể tái cấu trúc sang bảng `permissions` và ánh xạ role-permission, hoặc sử dụng các thư viện phân quyền khi thật sự cần. Hiện tại thiết kế tối ưu cho tốc độ và đơn giản.

---

Hệ thống RBAC đơn giản này đáp ứng nhu cầu hiện tại (2 vai trò) với chi phí bảo trì thấp và rõ ràng.
