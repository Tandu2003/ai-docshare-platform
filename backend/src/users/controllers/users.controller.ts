import { JwtAuthGuard } from '@/auth/guards';
import { AuthUser } from '@/auth/interfaces';
import { ResponseHelper } from '@/common';
import { AdminOnly, RoleGuard } from '@/common/authorization';
import {
  CreateUserDto,
  GetUsersQueryDto,
  UpdateUserDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from '@/users/dto';
import { UsersService } from '@/users/users.service';
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
import { FastifyReply, FastifyRequest } from 'fastify';

@Controller('users')
@UseGuards(JwtAuthGuard, RoleGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @AdminOnly()
  async getUsers(
    @Query() query: GetUsersQueryDto,
    @Req() request: FastifyRequest & { user: AuthUser },
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.usersService.getUsers(query);

    ResponseHelper.success(
      response,
      result,
      'Lấy danh sách người dùng thành công',
    );
  }

  @Get(':id')
  @AdminOnly()
  async getUserById(
    @Param('id') id: string,
    @Req() request: FastifyRequest & { user: AuthUser },
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.usersService.getUserById(id);

    ResponseHelper.success(
      response,
      result,
      'Lấy thông tin người dùng thành công',
    );
  }

  @Post()
  @AdminOnly()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Req() request: FastifyRequest & { user: AuthUser },
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.usersService.createUser(createUserDto);

    ResponseHelper.created(response, result, 'Tạo người dùng thành công');
  }

  @Patch(':id')
  @AdminOnly()
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: FastifyRequest & { user: AuthUser },
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.usersService.updateUser(id, updateUserDto);

    ResponseHelper.success(response, result, 'Cập nhật người dùng thành công');
  }

  @Patch(':id/role')
  @AdminOnly()
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @Req() request: FastifyRequest & { user: AuthUser },
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.usersService.updateUserRole(
      id,
      updateUserRoleDto,
    );

    ResponseHelper.success(
      response,
      result,
      'Cập nhật vai trò người dùng thành công',
    );
  }

  @Patch(':id/status')
  @AdminOnly()
  async updateUserStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
    @Req() request: FastifyRequest & { user: AuthUser },
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.usersService.updateUserStatus(
      id,
      updateUserStatusDto,
    );

    ResponseHelper.success(
      response,
      result,
      'Cập nhật trạng thái người dùng thành công',
    );
  }

  @Delete(':id')
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id') id: string,
    @Req() request: FastifyRequest & { user: AuthUser },
    @Res() response: FastifyReply,
  ): Promise<void> {
    await this.usersService.deleteUser(id);

    ResponseHelper.success(response, null, 'Xóa người dùng thành công');
  }

  @Patch(':id/undelete')
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  async unDeleteUser(
    @Param('id') id: string,
    @Req() request: FastifyRequest & { user: AuthUser },
    @Res() response: FastifyReply,
  ): Promise<void> {
    await this.usersService.unDeleteUser(id);

    ResponseHelper.success(response, null, 'Khôi phục người dùng thành công');
  }

  @Get(':id/activity')
  @AdminOnly()
  async getUserActivity(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() request: FastifyRequest & { user: AuthUser },
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.usersService.getUserActivity(id, page, limit);

    ResponseHelper.success(
      response,
      result,
      'Lấy hoạt động người dùng thành công',
    );
  }

  @Get(':id/statistics')
  @AdminOnly()
  async getUserStatistics(
    @Param('id') id: string,
    @Req() request: FastifyRequest & { user: AuthUser },
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.usersService.getUserStatistics(id);

    ResponseHelper.success(
      response,
      result,
      'Lấy thống kê người dùng thành công',
    );
  }

  @Get('roles/list')
  @AdminOnly()
  async getRoles(
    @Req() request: FastifyRequest & { user: AuthUser },
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.usersService.getRoles();

    ResponseHelper.success(
      response,
      result,
      'Lấy danh sách vai trò thành công',
    );
  }
}
