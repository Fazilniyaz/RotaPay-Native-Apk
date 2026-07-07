// store/slices/notificationsSlice.ts
// Shared notification feed + unread badge — the RN counterpart of the web app's
// notificationsStore. One poller (useNotificationsSync) refreshes this; the
// header badge, dashboard activity feed and Notifications screen all read it, so
// the app makes ONE notifications request per cycle instead of many.
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../../lib/services/notifications';
import { Notification } from '../../lib/types';

const FETCH_LIMIT = 100;

interface NotificationsState {
  items: Notification[];
  unread: number;
  loaded: boolean;
}

const initialState: NotificationsState = { items: [], unread: 0, loaded: false };

export const refreshNotifications = createAsyncThunk('notifications/refresh', async () => {
  const res = await listNotifications({ limit: FETCH_LIMIT });
  return { items: res.data, unread: res.unread };
});

export const markRead = createAsyncThunk('notifications/markRead', async (id: string) => {
  await markNotificationRead(id);
  return id;
});

export const markAllRead = createAsyncThunk('notifications/markAllRead', async () => {
  await markAllNotificationsRead();
});

export const removeNotification = createAsyncThunk('notifications/remove', async (id: string) => {
  await deleteNotification(id);
  return id;
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(refreshNotifications.fulfilled, (s, a) => {
        s.items = a.payload.items;
        s.unread = a.payload.unread;
        s.loaded = true;
      })
      .addCase(markRead.fulfilled, (s, a) => {
        const n = s.items.find((x) => x.id === a.payload);
        if (n && !n.isRead) {
          n.isRead = true;
          s.unread = Math.max(0, s.unread - 1);
        }
      })
      .addCase(markAllRead.fulfilled, (s) => {
        s.items.forEach((n) => (n.isRead = true));
        s.unread = 0;
      })
      .addCase(removeNotification.fulfilled, (s, a) => {
        const n = s.items.find((x) => x.id === a.payload);
        if (n && !n.isRead) s.unread = Math.max(0, s.unread - 1);
        s.items = s.items.filter((x) => x.id !== a.payload);
      });
  },
});

export default notificationsSlice.reducer;
