// lib/activityMeta.ts
// Icon + colours per notification/activity type — mirrors the web dashboard's
// ACTIVITY_META so the feed looks identical across web and native.
import { COLORS } from '../constants/theme';

export interface ActivityMeta {
  icon: string; // Ionicons name
  color: string;
  bg: string;
}

const MAP: Record<string, ActivityMeta> = {
  shift_added: { icon: 'add-circle-outline', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  shift_updated: { icon: 'create-outline', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  shift_removed: { icon: 'trash-outline', color: '#ba1a1a', bg: 'rgba(186,26,26,0.12)' },
  shift_reminder: { icon: 'alarm-outline', color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
  shift_water: { icon: 'water-outline', color: '#2563eb', bg: 'rgba(6,182,212,0.12)' },
  profile_updated: { icon: 'person-outline', color: '#888', bg: 'rgba(136,136,136,0.10)' },
  payment_confirmed: { icon: 'wallet-outline', color: '#1d4ed8', bg: 'rgba(29,78,216,0.12)' },
  employee_added: { icon: 'business-outline', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  wage_added: { icon: 'cash-outline', color: '#1d4ed8', bg: 'rgba(29,78,216,0.12)' },
  clock_in: { icon: 'log-in-outline', color: '#2563EB', bg: 'rgba(6,182,212,0.15)' },
  clock_out: { icon: 'log-out-outline', color: '#2563EB', bg: 'rgba(6,182,212,0.15)' },
};

export function activityMeta(type: string): ActivityMeta {
  return MAP[type] ?? { icon: 'notifications-outline', color: COLORS.outline, bg: 'rgba(136,136,136,0.10)' };
}
