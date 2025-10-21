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

export class SystemSettingsService {
  private static readonly BASE_URL = '/admin/settings';

  /**
   * Get all system settings
   */
  static async getAllSettings(): Promise<AllSettingsResponse> {
    const response = await api.get(`${this.BASE_URL}/all`);
    return response.data as AllSettingsResponse;
  }

  /**
   * Get settings by category
   */
  static async getSettingsByCategory(
    category: string,
  ): Promise<SystemSettingsResponse> {
    const response = await api.get(`${this.BASE_URL}`, {
      params: { category },
    });
    return response.data as SystemSettingsResponse;
  }

  /**
   * Get settings categories
   */
  static async getCategories(): Promise<CategoriesResponse> {
    const response = await api.get(`${this.BASE_URL}/categories`);
    return response.data as CategoriesResponse;
  }

  /**
   * Get AI moderation settings
   */
  static async getAIModerationSettings(): Promise<AISettings> {
    const response = await api.get(`${this.BASE_URL}`);
    return response.data as AISettings;
  }

  /**
   * Update a single setting
   */
  static async updateSetting(setting: SystemSetting): Promise<void> {
    await api.post(this.BASE_URL, setting);
  }

  /**
   * Bulk update settings
   */
  static async updateSettings(settings: SystemSetting[]): Promise<void> {
    await api.put(this.BASE_URL, settings);
  }

  /**
   * Delete a setting
   */
  static async deleteSetting(key: string): Promise<void> {
    await api.delete(`${this.BASE_URL}/${key}`);
  }

  /**
   * Initialize default settings
   */
  static async initializeDefaults(): Promise<void> {
    await api.post(`${this.BASE_URL}/initialize-defaults`);
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
}
