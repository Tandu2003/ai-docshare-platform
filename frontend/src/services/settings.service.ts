import { apiClient } from '@/utils/api-client';

export interface PointsSettings {
  uploadReward: number;
  downloadCost: number;
}

/**
 * Get public points settings (no authentication required)
 */
export const getPublicPointsSettings = async (): Promise<PointsSettings> => {
  const response = await apiClient.get<PointsSettings>(
    '/settings/public/points',
  );
  if (!response.data) {
    throw new Error('Failed to fetch points settings');
  }
  return response.data;
};

export const SettingsService = {
  getPublicPointsSettings,
};
