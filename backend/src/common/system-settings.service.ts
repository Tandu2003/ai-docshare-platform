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
      enableContentAnalysis: await this.getBooleanSetting(
        'ai.enable_content_analysis',
        true,
      ),
      enableSmartTags: await this.getBooleanSetting(
        'ai.enable_smart_tags',
        true,
      ),
      confidenceThreshold: await this.getNumericSetting(
        'ai.confidence_threshold',
        70,
      ),
    };
  }

  /**
   * Get all settings categories
   */
  async getSettingsCategories(): Promise<string[]> {
    try {
      const categories = await this.prisma.systemSetting.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });

      return categories.map(c => c.category);
    } catch (error) {
      this.logger.error('Error getting settings categories:', error);
      return [];
    }
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<SystemSettingValue[]> {
    try {
      const settings = await this.prisma.systemSetting.findMany({
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      });

      return settings.map(setting => ({
        key: setting.key,
        value: setting.value,
        description: setting.description || undefined,
        category: setting.category,
        isPublic: setting.isPublic,
      }));
    } catch (error) {
      this.logger.error('Error getting all settings:', error);
      return [];
    }
  }

  /**
   * Delete a system setting
   */
  async deleteSetting(key: string): Promise<void> {
    try {
      await this.prisma.systemSetting.delete({
        where: { key },
      });

      this.logger.log(`Setting ${key} deleted`);
    } catch (error) {
      this.logger.error(`Error deleting setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Bulk update settings
   */
  async updateSettings(settings: SystemSettingValue[]): Promise<void> {
    try {
      for (const setting of settings) {
        await this.setSetting(setting);
      }

      this.logger.log(`Updated ${settings.length} settings`);
    } catch (error) {
      this.logger.error('Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Initialize default system settings
   */
  async initializeDefaultSettings(): Promise<void> {
    const defaultSettings: SystemSettingValue[] = [
      // AI Moderation Settings
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
      {
        key: 'ai.enable_content_analysis',
        value: 'true',
        description: 'Enable AI content analysis for documents',
        category: 'ai',
        isPublic: false,
      },
      {
        key: 'ai.enable_smart_tags',
        value: 'true',
        description: 'Enable AI-generated tags for documents',
        category: 'ai',
        isPublic: false,
      },
      {
        key: 'ai.confidence_threshold',
        value: '70',
        description: 'Minimum confidence threshold for AI analysis (0-100)',
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

    this.logger.log('Default AI moderation settings initialized');
  }
}
