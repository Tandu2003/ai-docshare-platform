import { AuthUser } from '../interfaces';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

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
        'Bạn không có quyền truy cập tính năng này. Chỉ quản trị viên mới có thể thực hiện thao tác này.',
      );
    }

    return true;
  }
}
