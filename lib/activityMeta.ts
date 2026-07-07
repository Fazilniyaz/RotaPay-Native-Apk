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
  shift_added: { icon: 'add-circle-outline', color: '#0077cc', bg: 'rgba(0,119,204,0.12)' },
  shift_updated: { icon: 'create-outline', color: '#0077cc', bg: 'rgba(0,119,204,0.12)' },
  shift_removed: { icon: 'trash-outline', color: '#ba1a1a', bg: 'rgba(186,26,26,0.12)' },
  shift_reminder: { icon: 'alarm-outline', color: '#005ea3', bg: 'rgba(0,94,163,0.12)' },
  shift_water: { icon: 'water-outline', color: '#0891b2', bg: 'rgba(8,145,178,0.12)' },
  profile_updated: { icon: 'person-outline', color: '#888', bg: 'rgba(136,136,136,0.10)' },
  payment_confirmed: { icon: 'wallet-outline', color: '#008557', bg: 'rgba(0,133,87,0.12)' },
  employee_added: { icon: 'business-outline', color: '#0077cc', bg: 'rgba(0,119,204,0.12)' },
  wage_added: { icon: 'cash-outline', color: '#008557', bg: 'rgba(0,133,87,0.12)' },
  clock_in: { icon: 'log-in-outline', color: '#37D36B', bg: 'rgba(55,211,107,0.15)' },
  clock_out: { icon: 'log-out-outline', color: '#37D36B', bg: 'rgba(55,211,107,0.15)' },
};

export function activityMeta(type: string): ActivityMeta {
  return MAP[type] ?? { icon: 'notifications-outline', color: COLORS.outline, bg: 'rgba(136,136,136,0.10)' };
}
