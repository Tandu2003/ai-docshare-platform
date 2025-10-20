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
  Get,
  HttpStatus,
  Post,
  Query,
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
  @ApiOperation({ summary: 'Get system settings by category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System settings retrieved successfully',
  })
  async getSettings(@Query('category') category: string, @Res() res: Response) {
    try {
      const settings = await this.settingsService.getSettingsByCategory(
        category || 'general',
      );

      return ResponseHelper.success(
        res,
        { settings, category: category || 'general' },
        'Settings retrieved successfully',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Failed to retrieve settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('ai-moderation')
  @CheckPolicy({ action: 'read', subject: 'SystemSetting' })
  @ApiOperation({ summary: 'Get AI moderation settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI moderation settings retrieved successfully',
  })
  async getAIModerationSettings(@Res() res: Response) {
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
