import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AdminOnly, RoleGuard } from '@/common/authorization';
import { ResponseHelper } from '@/common/helpers/response.helper';
import {
  SystemSettingsService,
  SystemSettingValue,
} from '@/common/system-settings.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';

@ApiTags('System Settings')
@Controller('settings')
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get('public/points')
  @ApiOperation({ summary: 'Get public points settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Points settings retrieved successfully',
  })
  async getPublicPointsSettings(@Res() res: FastifyReply) {
    try {
      const settings = await this.settingsService.getPointsSettings();

      return ResponseHelper.success(
        res,
        settings,
        'Points settings retrieved successfully',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Failed to retrieve points settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('admin/points')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Get points settings (admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Points settings retrieved successfully',
  })
  async getPointsSettings(@Res() res: FastifyReply) {
    try {
      const settings = await this.settingsService.getPointsSettings();

      return ResponseHelper.success(
        res,
        settings,
        'Points settings retrieved successfully',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Failed to retrieve points settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Get AI moderation settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI moderation settings retrieved successfully',
  })
  async getSettings(@Res() res: FastifyReply) {
    try {
      const settings = await this.settingsService.getAIModerationSettings();

      return ResponseHelper.success(
        res,
        settings,
        'AI moderation settings retrieved successfully',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Failed to retrieve AI moderation settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Update system setting' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System setting updated successfully',
  })
  async updateSetting(
    @Body() setting: SystemSettingValue,
    @Res() res: FastifyReply,
  ) {
    try {
      await this.settingsService.setSetting(setting);

      return ResponseHelper.success(
        res,
        { key: setting.key, value: setting.value },
        'Setting updated successfully',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Failed to update setting',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All system settings retrieved successfully',
  })
  async getAllSettings(@Res() res: FastifyReply) {
    try {
      const settings = await this.settingsService.getAllSettings();

      return ResponseHelper.success(
        res,
        { settings },
        'All settings retrieved successfully',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Failed to retrieve all settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('admin/categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Get system settings categories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Settings categories retrieved successfully',
  })
  async getCategories(@Res() res: FastifyReply) {
    try {
      const categories = await this.settingsService.getSettingsCategories();

      return ResponseHelper.success(
        res,
        { categories },
        'Categories retrieved successfully',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Failed to retrieve categories',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Bulk update system settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Settings updated successfully',
  })
  async updateSettings(
    @Body() settings: SystemSettingValue[],
    @Res() res: FastifyReply,
  ) {
    try {
      await this.settingsService.updateSettings(settings);

      return ResponseHelper.success(
        res,
        { updatedCount: settings.length },
        'Settings updated successfully',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Failed to update settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('admin/:key')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Delete system setting' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Setting deleted successfully',
  })
  async deleteSetting(@Param('key') key: string, @Res() res: FastifyReply) {
    try {
      await this.settingsService.deleteSetting(key);

      return ResponseHelper.success(
        res,
        { key },
        'Setting deleted successfully',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Failed to delete setting',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('admin/initialize-defaults')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Initialize default system settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default settings initialized successfully',
  })
  async initializeDefaults(@Res() res: FastifyReply) {
    try {
      await this.settingsService.initializeDefaultSettings();

      return ResponseHelper.success(
        res,
        {},
        'Default settings initialized successfully',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Failed to initialize default settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
