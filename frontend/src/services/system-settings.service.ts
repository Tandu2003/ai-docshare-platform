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
  dailyEarnLimit: number; // 0 = unlimited, >0 = max points per day
  // downloadReward đã bị xóa - uploader nhận bằng đúng downloadCost
}

export interface SimilaritySettings {
  // Thresholds
  similarityDetection: number; // 0-1, default 0.85
  embeddingMatch: number; // 0-1, default 0.75
  hashMatch: number; // 0-1, default 0.95
  hashInclude: number; // 0-1, default 0.6
  // Combined weights (must sum to 1.0)
  hashWeight: number; // default 0.4
  textWeight: number; // default 0.3
  embeddingWeight: number; // default 0.3
  // Text similarity weights (must sum to 1.0)
  jaccardWeight: number; // default 0.6
  levenshteinWeight: number; // default 0.4
}

export class SystemSettingsService {
  private static readonly BASE_URL = '/settings';

  static async getAllSettings(): Promise<AllSettingsResponse> {
    const response = await api.get(`${this.BASE_URL}/admin/all`);
    return response.data as AllSettingsResponse;
  }

  static async getSettingsByCategory(
    category: string,
  ): Promise<SystemSettingsResponse> {
    const response = await api.get(`${this.BASE_URL}/admin`, {
      params: { category },
    });
    return response.data as SystemSettingsResponse;
  }

  static async getCategories(): Promise<CategoriesResponse> {
    const response = await api.get(`${this.BASE_URL}/admin/categories`);
    return response.data as CategoriesResponse;
  }

  static async getAIModerationSettings(): Promise<AISettings> {
    const response = await api.get(`${this.BASE_URL}/admin`);
    return response.data as AISettings;
  }

  static async updateSetting(setting: SystemSetting): Promise<void> {
    await api.post(`${this.BASE_URL}/admin`, setting);
  }

  static async updateSettings(settings: SystemSetting[]): Promise<void> {
    await api.put(`${this.BASE_URL}/admin`, settings);
  }

  static async deleteSetting(key: string): Promise<void> {
    await api.delete(`${this.BASE_URL}/admin/${key}`);
  }

  static async initializeDefaults(): Promise<void> {
    await api.post(`${this.BASE_URL}/admin/initialize-defaults`);
  }

  static async getPointsSettings(): Promise<PointsSettings> {
    const response = await api.get(`${this.BASE_URL}/admin/points`);
    return response.data as PointsSettings;
  }

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

    // Similarity settings - separate toggles for each checkpoint
    if (settings.enableSimilarityAutoReject !== undefined) {
      systemSettings.push({
        key: 'ai.enable_similarity_auto_reject',
        value: settings.enableSimilarityAutoReject.toString(),
        category: 'ai',
      });
    }

    if (settings.enableSimilarityManualReview !== undefined) {
      systemSettings.push({
        key: 'ai.enable_similarity_manual_review',
        value: settings.enableSimilarityManualReview.toString(),
        category: 'ai',
      });
    }

    if (settings.similarityAutoRejectThreshold !== undefined) {
      systemSettings.push({
        key: 'ai.similarity_auto_reject_threshold',
        value: settings.similarityAutoRejectThreshold.toString(),
        category: 'ai',
      });
    }

    if (settings.similarityManualReviewThreshold !== undefined) {
      systemSettings.push({
        key: 'ai.similarity_manual_review_threshold',
        value: settings.similarityManualReviewThreshold.toString(),
        category: 'ai',
      });
    }

    // Legacy setting for backward compatibility
    if (settings.enableSimilarityCheck !== undefined) {
      systemSettings.push({
        key: 'ai.enable_similarity_check',
        value: settings.enableSimilarityCheck.toString(),
        category: 'ai',
      });
    }

    if (systemSettings.length > 0) {
      await this.updateSettings(systemSettings);
    }
  }

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

    if (settings.dailyEarnLimit !== undefined) {
      systemSettings.push({
        key: 'points.daily_earn_limit',
        value: settings.dailyEarnLimit.toString(),
        category: 'points',
      });
    }

    // downloadReward đã bị xóa - uploader nhận bằng đúng downloadCost

    if (systemSettings.length > 0) {
      await this.updateSettings(systemSettings);
    }
  }

  static async getSimilaritySettings(): Promise<SimilaritySettings> {
    const response = await api.get(`${this.BASE_URL}/admin/similarity`);
    return response.data as SimilaritySettings;
  }

  static async updateSimilaritySettings(
    settings: Partial<SimilaritySettings>,
  ): Promise<void> {
    const systemSettings: SystemSetting[] = [];

    if (settings.similarityDetection !== undefined) {
      systemSettings.push({
        key: 'similarity.threshold.detection',
        value: settings.similarityDetection.toString(),
        category: 'similarity',
      });
    }

    if (settings.embeddingMatch !== undefined) {
      systemSettings.push({
        key: 'similarity.threshold.embedding',
        value: settings.embeddingMatch.toString(),
        category: 'similarity',
      });
    }

    if (settings.hashMatch !== undefined) {
      systemSettings.push({
        key: 'similarity.threshold.hash',
        value: settings.hashMatch.toString(),
        category: 'similarity',
      });
    }

    if (settings.hashInclude !== undefined) {
      systemSettings.push({
        key: 'similarity.threshold.hashInclude',
        value: settings.hashInclude.toString(),
        category: 'similarity',
      });
    }

    if (settings.hashWeight !== undefined) {
      systemSettings.push({
        key: 'similarity.weights.hash',
        value: settings.hashWeight.toString(),
        category: 'similarity',
      });
    }

    if (settings.textWeight !== undefined) {
      systemSettings.push({
        key: 'similarity.weights.text',
        value: settings.textWeight.toString(),
        category: 'similarity',
      });
    }

    if (settings.embeddingWeight !== undefined) {
      systemSettings.push({
        key: 'similarity.weights.embedding',
        value: settings.embeddingWeight.toString(),
        category: 'similarity',
      });
    }

    if (settings.jaccardWeight !== undefined) {
      systemSettings.push({
        key: 'similarity.textWeights.jaccard',
        value: settings.jaccardWeight.toString(),
        category: 'similarity',
      });
    }

    if (settings.levenshteinWeight !== undefined) {
      systemSettings.push({
        key: 'similarity.textWeights.levenshtein',
        value: settings.levenshteinWeight.toString(),
        category: 'similarity',
      });
    }

    if (systemSettings.length > 0) {
      await this.updateSettings(systemSettings);
    }
  }
}
