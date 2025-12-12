import { PrismaService } from '../prisma/prisma.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

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

  async getSettingWithDefault(
    key: string,
    defaultValue: string,
  ): Promise<string> {
    const value = await this.getSetting(key);
    return value || defaultValue;
  }

  async getNumericSetting(key: string, defaultValue: number): Promise<number> {
    const value = await this.getSetting(key);
    if (!value) return defaultValue;

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  async getBooleanSetting(
    key: string,
    defaultValue: boolean,
  ): Promise<boolean> {
    const value = await this.getSetting(key);
    if (!value) return defaultValue;

    return value.toLowerCase() === 'true';
  }

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
      this.logger.error(
        `Error setting ${setting.key}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Không thể cập nhật cài đặt');
    }
  }

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
      // Similarity moderation settings - separate toggles for each checkpoint
      enableSimilarityAutoReject: await this.getBooleanSetting(
        'ai.enable_similarity_auto_reject',
        true,
      ),
      enableSimilarityManualReview: await this.getBooleanSetting(
        'ai.enable_similarity_manual_review',
        true,
      ),
      similarityAutoRejectThreshold: await this.getNumericSetting(
        'ai.similarity_auto_reject_threshold',
        90, // Auto reject if similarity >= 90%
      ),
      similarityManualReviewThreshold: await this.getNumericSetting(
        'ai.similarity_manual_review_threshold',
        70, // Require manual review if similarity >= 70%
      ),
      // Legacy setting for backward compatibility
      enableSimilarityCheck: await this.getBooleanSetting(
        'ai.enable_similarity_check',
        true,
      ),
    };
  }

  async getPointsSettings() {
    return {
      uploadReward: await this.getNumericSetting('points.upload_reward', 5),
      downloadCost: await this.getNumericSetting('points.download_cost', 1),
      downloadReward: await this.getNumericSetting('points.download_reward', 1), // Points awarded to uploader per successful download
    };
  }

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

  async deleteSetting(key: string): Promise<void> {
    try {
      await this.prisma.systemSetting.delete({
        where: { key },
      });

      this.logger.log(`Setting ${key} deleted`);
    } catch (error) {
      this.logger.error(
        `Error deleting setting ${key}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Không thể xóa cài đặt');
    }
  }

  async updateSettings(settings: SystemSettingValue[]): Promise<void> {
    try {
      for (const setting of settings) {
        await this.setSetting(setting);
      }

      this.logger.log(`Updated ${settings.length} settings`);
    } catch (error) {
      this.logger.error(
        `Error updating settings: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Không thể cập nhật cài đặt');
    }
  }

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
      // Similarity moderation settings - separate toggles
      {
        key: 'ai.enable_similarity_auto_reject',
        value: 'true',
        description: 'Enable automatic rejection for highly similar documents',
        category: 'ai',
        isPublic: false,
      },
      {
        key: 'ai.enable_similarity_manual_review',
        value: 'true',
        description: 'Enable manual review requirement for similar documents',
        category: 'ai',
        isPublic: false,
      },
      {
        key: 'ai.similarity_auto_reject_threshold',
        value: '90',
        description:
          'Similarity threshold for automatic rejection (0-100, percentage)',
        category: 'ai',
        isPublic: false,
      },
      {
        key: 'ai.similarity_manual_review_threshold',
        value: '70',
        description:
          'Similarity threshold for manual review requirement (0-100, percentage)',
        category: 'ai',
        isPublic: false,
      },
      // Legacy setting for backward compatibility
      {
        key: 'ai.enable_similarity_check',
        value: 'true',
        description:
          'Enable similarity checking (legacy, use individual toggles)',
        category: 'ai',
        isPublic: false,
      },
      // Points System Settings
      {
        key: 'points.upload_reward',
        value: '5',
        description: 'Points awarded when user uploads a document',
        category: 'points',
        isPublic: true,
      },
      {
        key: 'points.download_cost',
        value: '1',
        description: 'Points cost for downloading a document',
        category: 'points',
        isPublic: true,
      },
      {
        key: 'points.download_reward',
        value: '1',
        description:
          'Points awarded to uploader when someone successfully downloads their document',
        category: 'points',
        isPublic: true,
      },
    ];

    for (const setting of defaultSettings) {
      const existing = await this.getSetting(setting.key);
      if (!existing) {
        await this.setSetting(setting);
      }
    }

    this.logger.log('Default system settings initialized');
  }
}
