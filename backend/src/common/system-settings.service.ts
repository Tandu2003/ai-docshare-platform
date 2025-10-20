import { PrismaService } from '../prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

export interface SystemSettingValue {
  key: string;
  value: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
}

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get a system setting by key
   */
  async getSetting(key: string): Promise<string | null> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key },
      });
      return setting?.value || null;
    } catch (error) {
      this.logger.error(`Error getting setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Get a system setting with default value
   */
  async getSettingWithDefault(
    key: string,
    defaultValue: string,
  ): Promise<string> {
    const value = await this.getSetting(key);
    return value || defaultValue;
  }

  /**
   * Get a numeric system setting with default value
   */
  async getNumericSetting(key: string, defaultValue: number): Promise<number> {
    const value = await this.getSetting(key);
    if (!value) return defaultValue;

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get a boolean system setting with default value
   */
  async getBooleanSetting(
    key: string,
    defaultValue: boolean,
  ): Promise<boolean> {
    const value = await this.getSetting(key);
    if (!value) return defaultValue;

    return value.toLowerCase() === 'true';
  }

  /**
   * Set a system setting
   */
  async setSetting(setting: SystemSettingValue): Promise<void> {
    try {
      await this.prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          description: setting.description,
          category: setting.category || 'general',
          isPublic: setting.isPublic || false,
        },
        create: {
          key: setting.key,
          value: setting.value,
          description: setting.description,
          category: setting.category || 'general',
          isPublic: setting.isPublic || false,
        },
      });

      this.logger.log(`Setting ${setting.key} updated to: ${setting.value}`);
    } catch (error) {
      this.logger.error(`Error setting ${setting.key}:`, error);
      throw error;
    }
  }

  /**
   * Get all settings by category
   */
  async getSettingsByCategory(category: string): Promise<SystemSettingValue[]> {
    try {
      const settings = await this.prisma.systemSetting.findMany({
        where: { category },
        orderBy: { key: 'asc' },
      });

      return settings.map(setting => ({
        key: setting.key,
        value: setting.value,
        description: setting.description || undefined,
        category: setting.category,
        isPublic: setting.isPublic,
      }));
    } catch (error) {
      this.logger.error(
        `Error getting settings for category ${category}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Get AI moderation settings
   */
  async getAIModerationSettings() {
    return {
      autoApprovalThreshold: await this.getNumericSetting(
        'ai.auto_approval_threshold',
        80,
      ),
      autoRejectThreshold: await this.getNumericSetting(
        'ai.auto_reject_threshold',
        30,
      ),
      enableAutoApproval: await this.getBooleanSetting(
        'ai.enable_auto_approval',
        false,
      ),
      enableAutoRejection: await this.getBooleanSetting(
        'ai.enable_auto_rejection',
        true,
      ),
    };
  }

  /**
   * Initialize default AI moderation settings
   */
  async initializeDefaultSettings(): Promise<void> {
    const defaultSettings: SystemSettingValue[] = [
      {
        key: 'ai.auto_approval_threshold',
        value: '80',
        description:
          'AI moderation score threshold for automatic approval (0-100)',
        category: 'ai',
        isPublic: false,
      },
      {
        key: 'ai.auto_reject_threshold',
        value: '30',
        description:
          'AI moderation score threshold for automatic rejection (0-100)',
        category: 'ai',
        isPublic: false,
      },
      {
        key: 'ai.enable_auto_approval',
        value: 'false',
        description: 'Enable automatic approval based on AI moderation score',
        category: 'ai',
        isPublic: false,
      },
      {
        key: 'ai.enable_auto_rejection',
        value: 'true',
        description: 'Enable automatic rejection based on AI moderation score',
        category: 'ai',
        isPublic: false,
      },
    ];

    for (const setting of defaultSettings) {
      const existing = await this.getSetting(setting.key);
      if (!existing) {
        await this.setSetting(setting);
      }
    }
  }
}
