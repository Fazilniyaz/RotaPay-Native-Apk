// hooks/useNotificationsSync.ts
// The single notifications poller for the whole app — mount once in the (app)
// layout. Refreshes the shared notifications slice every minute so the header
// badge, dashboard activity feed and Notifications screen all stay current
// (including "shift starts in an hour" reminders, which surface when due).
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { refreshNotifications } from '../store/slices/notificationsSlice';

const POLL_MS = 60_000;

export function useNotificationsSync() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    let active = true;
    const tick = () => {
      if (!active) return;
      dispatch(refreshNotifications());
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [dispatch]);
}
