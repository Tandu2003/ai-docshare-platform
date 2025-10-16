import {
  CreateUserDto,
  GetUsersQueryDto,
  UpdateUserDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from './dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/auth/guards';
import { AuthUser } from '@/auth/interfaces';
import { ResponseHelper } from '@/common';
import { AdminOnly, CaslGuard, CheckPolicy } from '@/common/casl';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Controller('users')
@UseGuards(JwtAuthGuard, CaslGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @AdminOnly()
  @CheckPolicy({ action: 'read', subject: 'User' })
  async getUsers(
    @Query() query: GetUsersQueryDto,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.usersService.getUsers(query, request.user);

    ResponseHelper.success(
      response,
      result,
      'Lấy danh sách người dùng thành công',
    );
  }

  @Get(':id')
  @AdminOnly()
  @CheckPolicy({ action: 'read', subject: 'User' })
  async getUserById(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.usersService.getUserById(id, request.user);

    ResponseHelper.success(
      response,
      result,
      'Lấy thông tin người dùng thành công',
    );
  }

  @Post()
  @AdminOnly()
  @CheckPolicy({ action: 'create', subject: 'User' })
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.usersService.createUser(
      createUserDto,
      request.user,
    );

    ResponseHelper.created(response, result, 'Tạo người dùng thành công');
  }

  @Patch(':id')
  @AdminOnly()
  @CheckPolicy({ action: 'update', subject: 'User' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.usersService.updateUser(
      id,
      updateUserDto,
      request.user,
    );

    ResponseHelper.success(response, result, 'Cập nhật người dùng thành công');
  }

  @Patch(':id/role')
  @AdminOnly()
  @CheckPolicy({ action: 'update', subject: 'User' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.usersService.updateUserRole(
      id,
      updateUserRoleDto,
      request.user,
    );

    ResponseHelper.success(
      response,
      result,
      'Cập nhật vai trò người dùng thành công',
    );
  }

  @Patch(':id/status')
  @AdminOnly()
  @CheckPolicy({ action: 'update', subject: 'User' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.usersService.updateUserStatus(
      id,
      updateUserStatusDto,
      request.user,
    );

    ResponseHelper.success(
      response,
      result,
      'Cập nhật trạng thái người dùng thành công',
    );
  }

  @Delete(':id')
  @AdminOnly()
  @CheckPolicy({ action: 'delete', subject: 'User' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response,
  ): Promise<void> {
    await this.usersService.deleteUser(id, request.user);

    ResponseHelper.success(response, null, 'Xóa người dùng thành công');
  }

  @Get(':id/activity')
  @AdminOnly()
  @CheckPolicy({ action: 'read', subject: 'User' })
  async getUserActivity(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.usersService.getUserActivity(
      id,
      page,
      limit,
      request.user,
    );

    ResponseHelper.success(
      response,
      result,
      'Lấy hoạt động người dùng thành công',
    );
  }

  @Get(':id/statistics')
  @AdminOnly()
  @CheckPolicy({ action: 'read', subject: 'User' })
  async getUserStatistics(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.usersService.getUserStatistics(id, request.user);

    ResponseHelper.success(
      response,
      result,
      'Lấy thống kê người dùng thành công',
    );
  }

  @Get('roles/list')
  @AdminOnly()
  @CheckPolicy({ action: 'read', subject: 'User' })
  async getRoles(
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.usersService.getRoles(request.user);

    ResponseHelper.success(
      response,
      result,
      'Lấy danh sách vai trò thành công',
    );
  }
}
