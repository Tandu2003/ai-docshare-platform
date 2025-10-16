import apiClient from '@/utils/api-client';

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  onlyUnread?: boolean;
}

export async function getMyNotifications(params: GetNotificationsParams = {}) {
  const { page = 1, limit = 20, onlyUnread } = params;
  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', String(limit));
  if (onlyUnread !== undefined) query.set('onlyUnread', String(!!onlyUnread));
  const res = await apiClient.get(`/notifications?${query.toString()}`);
  return res.data;
}
