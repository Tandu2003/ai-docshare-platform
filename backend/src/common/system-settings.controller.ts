import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaslGuard, CheckPolicy } from '../common/casl';
import { ResponseHelper } from '../common/helpers/response.helper';
import {
  SystemSettingsService,
  SystemSettingValue,
} from './system-settings.service';
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
import { Response } from 'express';

@ApiTags('System Settings')
@ApiBearerAuth()
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, CaslGuard)
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get()
  @CheckPolicy({ action: 'read', subject: 'SystemSetting' })
  @ApiOperation({ summary: 'Get AI moderation settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI moderation settings retrieved successfully',
  })
  async getSettings(@Res() res: Response) {
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

  @Post()
  @CheckPolicy({ action: 'update', subject: 'SystemSetting' })
  @ApiOperation({ summary: 'Update system setting' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System setting updated successfully',
  })
  async updateSetting(
    @Body() setting: SystemSettingValue,
    @Res() res: Response,
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

  @Get('all')
  @CheckPolicy({ action: 'read', subject: 'SystemSetting' })
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All system settings retrieved successfully',
  })
  async getAllSettings(@Res() res: Response) {
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

  @Get('categories')
  @CheckPolicy({ action: 'read', subject: 'SystemSetting' })
  @ApiOperation({ summary: 'Get system settings categories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Settings categories retrieved successfully',
  })
  async getCategories(@Res() res: Response) {
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

  @Put()
  @CheckPolicy({ action: 'update', subject: 'SystemSetting' })
  @ApiOperation({ summary: 'Bulk update system settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Settings updated successfully',
  })
  async updateSettings(
    @Body() settings: SystemSettingValue[],
    @Res() res: Response,
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

  @Delete(':key')
  @CheckPolicy({ action: 'delete', subject: 'SystemSetting' })
  @ApiOperation({ summary: 'Delete system setting' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Setting deleted successfully',
  })
  async deleteSetting(@Param('key') key: string, @Res() res: Response) {
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

  @Post('initialize-defaults')
  @CheckPolicy({ action: 'create', subject: 'SystemSetting' })
  @ApiOperation({ summary: 'Initialize default system settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default settings initialized successfully',
  })
  async initializeDefaults(@Res() res: Response) {
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
