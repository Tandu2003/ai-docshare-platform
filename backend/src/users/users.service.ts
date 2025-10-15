import * as bcrypt from 'bcrypt'

import { AuthUser } from '@/auth/interfaces'
import { PrismaService } from '@/prisma/prisma.service'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import {
  CreateUserDto,
  GetUsersQueryDto,
  UpdateUserDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from './dto'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(query: GetUsersQueryDto, _currentUser: AuthUser) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Xây dựng điều kiện where
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = { name: role };
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (typeof isVerified === 'boolean') {
      where.isVerified = isVerified;
    }

    // Xây dựng orderBy
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Lấy dữ liệu
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          _count: {
            select: {
              documents: true,
              ratings: true,
              comments: true,
              bookmarks: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Loại bỏ password khỏi kết quả
    const usersWithoutPassword = users.map(({ password, ...user }) => user);

    return {
      users: usersWithoutPassword,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getUserById(id: string, _currentUser: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true,
          },
        },
        _count: {
          select: {
            documents: true,
            ratings: true,
            comments: true,
            bookmarks: true,
            downloads: true,
            views: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Loại bỏ password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async createUser(createUserDto: CreateUserDto, _currentUser: AuthUser) {
    // Kiểm tra email và username đã tồn tại
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: createUserDto.email }, { username: createUserDto.username }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('Email hoặc tên đăng nhập đã tồn tại');
    }

    // Kiểm tra role tồn tại
    const role = await this.prisma.role.findUnique({
      where: { id: createUserDto.roleId },
    });

    if (!role) {
      throw new BadRequestException('Vai trò không tồn tại');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Tạo user
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Loại bỏ password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto, _currentUser: AuthUser) {
    // Kiểm tra user tồn tại
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Nếu cập nhật email hoặc username, kiểm tra trùng lặp
    if (updateUserDto.email || updateUserDto.username) {
      const duplicateUser = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(updateUserDto.email ? [{ email: updateUserDto.email }] : []),
                ...(updateUserDto.username ? [{ username: updateUserDto.username }] : []),
              ],
            },
          ],
        },
      });

      if (duplicateUser) {
        throw new BadRequestException('Email hoặc tên đăng nhập đã tồn tại');
      }
    }

    // Hash password mới nếu có
    const updateData: any = { ...updateUserDto };
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Cập nhật user
    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Loại bỏ password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUserRole(id: string, updateUserRoleDto: UpdateUserRoleDto, _currentUser: AuthUser) {
    // Kiểm tra user tồn tại
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Kiểm tra role tồn tại
    const role = await this.prisma.role.findUnique({
      where: { id: updateUserRoleDto.roleId },
    });

    if (!role) {
      throw new BadRequestException('Vai trò không tồn tại');
    }

    // Cập nhật role
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { roleId: updateUserRoleDto.roleId },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Loại bỏ password
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async updateUserStatus(
    id: string,
    updateUserStatusDto: UpdateUserStatusDto,
    _currentUser: AuthUser
  ) {
    // Kiểm tra user tồn tại
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Cập nhật trạng thái
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserStatusDto,
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Loại bỏ password
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async deleteUser(id: string, _currentUser: AuthUser) {
    // Không cho phép xóa chính mình
    if (_currentUser.id === id) {
      throw new BadRequestException('Bạn không thể xóa chính mình');
    }

    // Kiểm tra user tồn tại
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Xóa user (cascade sẽ xóa các bản ghi liên quan)
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async getUserActivity(id: string, page: number, limit: number, _currentUser: AuthUser) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { userId: id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count({
        where: { userId: id },
      }),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getUserStatistics(id: string, _currentUser: AuthUser) {
    const [documentCount, downloadCount, viewCount, ratingCount, commentCount, bookmarkCount] =
      await Promise.all([
        this.prisma.document.count({ where: { uploaderId: id } }),
        this.prisma.download.count({ where: { userId: id } }),
        this.prisma.view.count({ where: { userId: id } }),
        this.prisma.rating.count({ where: { userId: id } }),
        this.prisma.comment.count({ where: { userId: id } }),
        this.prisma.bookmark.count({ where: { userId: id } }),
      ]);

    return {
      documentCount,
      downloadCount,
      viewCount,
      ratingCount,
      commentCount,
      bookmarkCount,
    };
  }
}
