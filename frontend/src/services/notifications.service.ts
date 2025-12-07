import { apiClient } from '@/utils/api-client';

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
export async function markNotificationAsRead(notificationId: string) {
  const res = await apiClient.patch(`/notifications/${notificationId}/read`);
  return res.data;
}

export async function markAllNotificationsAsRead() {
  const res = await apiClient.patch('/notifications/read-all');
  return res.data;
}

export async function deleteNotification(notificationId: string) {
  const res = await apiClient.delete(`/notifications/${notificationId}`);
  return res.data;
}

export async function deleteNotifications(ids: string[]) {
  const res = await apiClient.delete('/notifications', {
    data: { ids },
  });
  return res.data;
}
