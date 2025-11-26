import { JwtAuthGuard } from './guards';
import { RoleService } from './role.service';
import { AdminOnly, RoleGuard } from '@/common/authorization';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';

interface Permission {
  action: string;
  subject: string;
  conditions?: Record<string, any>;
}

@Controller('roles')
@AdminOnly()
@UseGuards(JwtAuthGuard, RoleGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  async getAllRoles() {
    return this.roleService.getAllRoles();
  }

  @Get('defaults')
  getDefaultRoles() {
    return this.roleService.getDefaultRoles();
  }

  @Post()
  async createRole(
    @Body()
    body: {
      name: string;
      description: string;
      permissions: Permission[];
    },
  ) {
    const { name, description, permissions } = body;
    return this.roleService.createRole(name, description, permissions);
  }

  @Put(':roleId/permissions')
  async updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() body: { permissions: Permission[] },
  ) {
    const { permissions } = body;
    return this.roleService.updateRolePermissions(roleId, permissions);
  }

  @Post(':roleId/assign/:userId')
  async assignRoleToUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
  ) {
    return this.roleService.assignRoleToUser(userId, roleId);
  }

  @Get('user/:userId')
  async getUserRole(@Param('userId') userId: string) {
    return this.roleService.getUserRole(userId);
  }

  @Post('initialize')
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
