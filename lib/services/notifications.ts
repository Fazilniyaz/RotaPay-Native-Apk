// lib/services/notifications.ts — Recent-activity feed / notifications.
import api from '@/lib/api';
import { ApiResponse, Notification, PaginationMeta } from '@/lib/types';

export async function listNotifications(params?: {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ data: Notification[]; unread: number; meta?: PaginationMeta }> {
  const res = await api.get<ApiResponse<Notification[]>>('/notifications', { params });
  return {
    data: res.data.data ?? [],
    unread: res.data.meta?.summary?.unread ?? 0,
    meta: res.data.meta,
  };
}

export async function getUnreadCount(): Promise<number> {
  const res = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
  return res.data.data?.count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}
