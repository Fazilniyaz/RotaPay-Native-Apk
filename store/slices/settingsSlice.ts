// store/slices/settingsSlice.ts
// Cross-cutting user profile + global preferences (currency / date / time /
// clock-in mode). Feature data (shifts, employers, …) is fetched per-screen;
// only app-wide settings live here so the header, formatters and Settings screen
// stay in sync. The pure formatter snapshot (lib/format) is updated inside the
// settings service, so this slice is just the reactive mirror for the UI.
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getSettings as apiGetSettings,
  updateSettings as apiUpdateSettings,
  updateProfilePicture as apiUpdateProfilePicture,
  removeProfilePicture as apiRemoveProfilePicture,
  UpdateSettingsInput,
  SettingsPayload,
} from '../../lib/services/settings';
import { DateFormat, TimeFormat } from '../../lib/format';

export interface SettingsState {
  displayName: string;
  email: string;
  profilePicture: string | null;
  currency: string;
  nativeCurrency: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  reportMonths: number;
  clockInType: 'automatic' | 'manual';
  // Default employee id (scopes calendar/earnings/reports); null → onboarding.
  defaultEmployerId: string | null;
  loaded: boolean;
  saving: boolean;
}

const initialState: SettingsState = {
  displayName: '',
  email: '',
  profilePicture: null,
  currency: 'GBP',
  nativeCurrency: 'GBP',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  reportMonths: 1,
  clockInType: 'automatic',
  defaultEmployerId: null,
  loaded: false,
  saving: false,
};

const fromPayload = (p: SettingsPayload): Partial<SettingsState> => ({
  displayName: p.profile.displayName,
  email: p.profile.email,
  profilePicture: p.profile.profilePicture,
  currency: p.settings.currency,
  nativeCurrency: p.settings.nativeCurrency,
  dateFormat: p.settings.dateFormat,
  timeFormat: p.settings.timeFormat,
  reportMonths: p.settings.reportMonths,
  clockInType: p.settings.clockInType,
  defaultEmployerId: p.defaultEmployerId ?? null,
  loaded: true,
});

export const loadSettings = createAsyncThunk('settings/load', async () => apiGetSettings());

export const saveSettings = createAsyncThunk(
  'settings/save',
  async (input: UpdateSettingsInput) => apiUpdateSettings(input)
);

export const uploadPhoto = createAsyncThunk('settings/uploadPhoto', async (image: string) =>
  apiUpdateProfilePicture(image)
);

export const removePhoto = createAsyncThunk('settings/removePhoto', async () =>
  apiRemoveProfilePicture()
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setProfileName: (state, action: PayloadAction<string>) => {
      state.displayName = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSettings.fulfilled, (s, a) => Object.assign(s, fromPayload(a.payload)))
      .addCase(saveSettings.pending, (s) => {
        s.saving = true;
      })
      .addCase(saveSettings.fulfilled, (s, a) => {
        Object.assign(s, fromPayload(a.payload));
        s.saving = false;
      })
      .addCase(saveSettings.rejected, (s) => {
        s.saving = false;
      })
      .addCase(uploadPhoto.fulfilled, (s, a) => Object.assign(s, fromPayload(a.payload)))
      .addCase(removePhoto.fulfilled, (s, a) => Object.assign(s, fromPayload(a.payload)));
  },
});

export const { setProfileName } = settingsSlice.actions;
export default settingsSlice.reducer;
