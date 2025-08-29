import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { JwtAuthGuard } from './guards';
import { CheckPolicy, CheckPolicies } from '@/common/casl';
import { Permission } from '@/common/casl';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @CheckPolicy({ action: 'read', subject: 'SystemSetting' })
  async getAllRoles() {
    return this.roleService.getAllRoles();
  }

  @Get('defaults')
  @CheckPolicy({ action: 'read', subject: 'SystemSetting' })
  async getDefaultRoles() {
    return this.roleService.getDefaultRoles();
  }

  @Post()
  @CheckPolicy({ action: 'create', subject: 'SystemSetting' })
  async createRole(@Body() body: { name: string; description: string; permissions: Permission[] }) {
    const { name, description, permissions } = body;
    return this.roleService.createRole(name, description, permissions);
  }

  @Put(':roleId/permissions')
  @CheckPolicy({ action: 'update', subject: 'SystemSetting' })
  async updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() body: { permissions: Permission[] }
  ) {
    const { permissions } = body;
    return this.roleService.updateRolePermissions(roleId, permissions);
  }

  @Post(':roleId/assign/:userId')
  @CheckPolicy({ action: 'update', subject: 'User' })
  async assignRoleToUser(@Param('roleId') roleId: string, @Param('userId') userId: string) {
    return this.roleService.assignRoleToUser(userId, roleId);
  }

  @Get('user/:userId')
  @CheckPolicy({ action: 'read', subject: 'User' })
  async getUserRole(@Param('userId') userId: string) {
    return this.roleService.getUserRole(userId);
  }

  @Post('initialize')
  @CheckPolicy({ action: 'create', subject: 'SystemSetting' })
  async initializeDefaultRoles() {
    await this.roleService.initializeDefaultRoles();
    return { message: 'Default roles initialized successfully' };
  }

  @Get('my-role')
  async getMyRole(@Request() req: any) {
    const userId = req.user.sub;
    return this.roleService.getUserRole(userId);
  }
}
