import { api } from '@/config/api';
import { AISettings } from '@/types/database.types';

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
}

export interface SystemSettingsResponse {
  settings: SystemSetting[];
  category: string;
}

export interface AllSettingsResponse {
  settings: SystemSetting[];
}

export interface CategoriesResponse {
  categories: string[];
}

export interface PointsSettings {
  uploadReward: number;
  downloadCost: number;
  // downloadReward đã bị xóa - uploader nhận bằng đúng downloadCost
}

export class SystemSettingsService {
  private static readonly BASE_URL = '/settings';

  /**
   * Get all system settings
   */
  static async getAllSettings(): Promise<AllSettingsResponse> {
    const response = await api.get(`${this.BASE_URL}/admin/all`);
    return response.data as AllSettingsResponse;
  }

  /**
   * Get settings by category
   */
  static async getSettingsByCategory(
    category: string,
  ): Promise<SystemSettingsResponse> {
    const response = await api.get(`${this.BASE_URL}/admin`, {
      params: { category },
    });
    return response.data as SystemSettingsResponse;
  }

  /**
   * Get settings categories
   */
  static async getCategories(): Promise<CategoriesResponse> {
    const response = await api.get(`${this.BASE_URL}/admin/categories`);
    return response.data as CategoriesResponse;
  }

  /**
   * Get AI moderation settings
   */
  static async getAIModerationSettings(): Promise<AISettings> {
    const response = await api.get(`${this.BASE_URL}/admin`);
    return response.data as AISettings;
  }

  /**
   * Update a single setting
   */
  static async updateSetting(setting: SystemSetting): Promise<void> {
    await api.post(`${this.BASE_URL}/admin`, setting);
  }

  /**
   * Bulk update settings
   */
  static async updateSettings(settings: SystemSetting[]): Promise<void> {
    await api.put(`${this.BASE_URL}/admin`, settings);
  }

  /**
   * Delete a setting
   */
  static async deleteSetting(key: string): Promise<void> {
    await api.delete(`${this.BASE_URL}/admin/${key}`);
  }

  /**
   * Initialize default settings
   */
  static async initializeDefaults(): Promise<void> {
    await api.post(`${this.BASE_URL}/admin/initialize-defaults`);
  }

  /**
   * Get points settings
   */
  static async getPointsSettings(): Promise<PointsSettings> {
    const response = await api.get(`${this.BASE_URL}/admin/points`);
    return response.data as PointsSettings;
  }

  /**
   * Update AI settings
   */
  static async updateAISettings(settings: Partial<AISettings>): Promise<void> {
    const systemSettings: SystemSetting[] = [];

    if (settings.autoApprovalThreshold !== undefined) {
      systemSettings.push({
        key: 'ai.auto_approval_threshold',
        value: settings.autoApprovalThreshold.toString(),
        category: 'ai',
      });
    }

    if (settings.autoRejectThreshold !== undefined) {
      systemSettings.push({
        key: 'ai.auto_reject_threshold',
        value: settings.autoRejectThreshold.toString(),
        category: 'ai',
      });
    }

    if (settings.enableAutoApproval !== undefined) {
      systemSettings.push({
        key: 'ai.enable_auto_approval',
        value: settings.enableAutoApproval.toString(),
        category: 'ai',
      });
    }

    if (settings.enableAutoRejection !== undefined) {
      systemSettings.push({
        key: 'ai.enable_auto_rejection',
        value: settings.enableAutoRejection.toString(),
        category: 'ai',
      });
    }

    if (settings.enableContentAnalysis !== undefined) {
      systemSettings.push({
        key: 'ai.enable_content_analysis',
        value: settings.enableContentAnalysis.toString(),
        category: 'ai',
      });
    }

    if (settings.enableSmartTags !== undefined) {
      systemSettings.push({
        key: 'ai.enable_smart_tags',
        value: settings.enableSmartTags.toString(),
        category: 'ai',
      });
    }

    if (settings.confidenceThreshold !== undefined) {
      systemSettings.push({
        key: 'ai.confidence_threshold',
        value: settings.confidenceThreshold.toString(),
        category: 'ai',
      });
    }

    if (systemSettings.length > 0) {
      await this.updateSettings(systemSettings);
    }
  }

  /**
   * Update points settings
   */
  static async updatePointsSettings(
    settings: Partial<PointsSettings>,
  ): Promise<void> {
    const systemSettings: SystemSetting[] = [];

    if (settings.uploadReward !== undefined) {
      systemSettings.push({
        key: 'points.upload_reward',
        value: settings.uploadReward.toString(),
        category: 'points',
      });
    }

    if (settings.downloadCost !== undefined) {
      systemSettings.push({
        key: 'points.download_cost',
        value: settings.downloadCost.toString(),
        category: 'points',
      });
    }

    if (settings.downloadReward !== undefined) {
      systemSettings.push({
        key: 'points.download_reward',
        value: settings.downloadReward.toString(),
        category: 'points',
      });
    }

    if (systemSettings.length > 0) {
      await this.updateSettings(systemSettings);
    }
  }
}
