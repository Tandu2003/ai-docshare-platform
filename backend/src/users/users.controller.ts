import { Request, Response } from 'express'

import { AdminGuard, JwtAuthGuard } from '@/auth/guards'
import { AuthUser } from '@/auth/interfaces'
import { ResponseHelper } from '@/common'
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
} from '@nestjs/common'

import {
  CreateUserDto,
  GetUsersQueryDto,
  UpdateUserDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from './dto'
import { UsersService } from './users.service'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUsers(
    @Query() query: GetUsersQueryDto,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response
  ): Promise<void> {
    const result = await this.usersService.getUsers(query, request.user);

    ResponseHelper.success(response, result, 'Lấy danh sách người dùng thành công');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserById(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response
  ): Promise<void> {
    const result = await this.usersService.getUserById(id, request.user);

    ResponseHelper.success(response, result, 'Lấy thông tin người dùng thành công');
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response
  ): Promise<void> {
    const result = await this.usersService.createUser(createUserDto, request.user);

    ResponseHelper.created(response, result, 'Tạo người dùng thành công');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response
  ): Promise<void> {
    const result = await this.usersService.updateUser(id, updateUserDto, request.user);

    ResponseHelper.success(response, result, 'Cập nhật người dùng thành công');
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response
  ): Promise<void> {
    const result = await this.usersService.updateUserRole(id, updateUserRoleDto, request.user);

    ResponseHelper.success(response, result, 'Cập nhật vai trò người dùng thành công');
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateUserStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response
  ): Promise<void> {
    const result = await this.usersService.updateUserStatus(id, updateUserStatusDto, request.user);

    ResponseHelper.success(response, result, 'Cập nhật trạng thái người dùng thành công');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response
  ): Promise<void> {
    await this.usersService.deleteUser(id, request.user);

    ResponseHelper.success(response, null, 'Xóa người dùng thành công');
  }

  @Get(':id/activity')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserActivity(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response
  ): Promise<void> {
    const result = await this.usersService.getUserActivity(id, page, limit, request.user);

    ResponseHelper.success(response, result, 'Lấy hoạt động người dùng thành công');
  }

  @Get(':id/statistics')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserStatistics(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response
  ): Promise<void> {
    const result = await this.usersService.getUserStatistics(id, request.user);

    ResponseHelper.success(response, result, 'Lấy thống kê người dùng thành công');
  }
}
