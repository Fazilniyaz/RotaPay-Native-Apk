// lib/services/settings.ts — profile + global preferences.
// Mirrors the web payload and keeps the formatter snapshot (lib/format) in sync
// so currency/date/time formatting updates app-wide the moment settings load.
import api from '@/lib/api';
import { ApiResponse } from '@/lib/types';
import { setFormatSettings, DateFormat, TimeFormat } from '@/lib/format';

export interface SettingsPayload {
  profile: { displayName: string; email: string; profilePicture: string | null };
  // The default employee id (scopes calendar/earnings/reports); null → onboarding.
  defaultEmployerId: string | null;
  settings: {
    currency: string;
    nativeCurrency: string;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
    reportMonths: number;
    clockInType: 'automatic' | 'manual';
    theme?: string;
    language?: string;
  };
}

export interface UpdateSettingsInput {
  displayName?: string;
  currency?: string;
  nativeCurrency?: string;
  dateFormat?: DateFormat;
  timeFormat?: TimeFormat;
  reportMonths?: number;
  clockInType?: 'automatic' | 'manual';
}

// Push the currency/date/time preferences into the pure-function formatter snapshot.
function syncFormat(p: SettingsPayload) {
  setFormatSettings({
    currency: p.settings.currency,
    dateFormat: p.settings.dateFormat,
    timeFormat: p.settings.timeFormat,
  });
}

export async function getSettings(): Promise<SettingsPayload> {
  const res = await api.get<ApiResponse<SettingsPayload>>('/settings');
  const data = res.data.data as SettingsPayload;
  syncFormat(data);
  return data;
}

export async function updateSettings(input: UpdateSettingsInput): Promise<SettingsPayload> {
  const res = await api.patch<ApiResponse<SettingsPayload>>('/settings', input);
  const data = res.data.data as SettingsPayload;
  syncFormat(data);
  return data;
}

// Upload a new profile picture (base64 data URI). The backend replaces the image
// on ImageKit and deletes the previous one.
export async function updateProfilePicture(image: string): Promise<SettingsPayload> {
  const res = await api.patch<ApiResponse<SettingsPayload>>('/settings/profile-picture', { image });
  const data = res.data.data as SettingsPayload;
  syncFormat(data);
  return data;
}

// Remove the current profile picture (deletes it from ImageKit).
export async function removeProfilePicture(): Promise<SettingsPayload> {
  const res = await api.delete<ApiResponse<SettingsPayload>>('/settings/profile-picture');
  const data = res.data.data as SettingsPayload;
  syncFormat(data);
  return data;
}

// Permanently delete the user's account and all of its data. Irreversible —
// the caller must confirm first, then log out on success.
export async function deleteAccount(): Promise<void> {
  await api.delete('/settings/account');
}
