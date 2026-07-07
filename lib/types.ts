// lib/types.ts
// Shared API types — mirror of the backend response contracts and the web app's
// lib/types.ts, so the native service layer stays 1:1 with RotoPay-Admin-WebApp.

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary?: Record<string, number>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  meta?: PaginationMeta;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  profilePicture?: string;
  emailVerified: boolean;
  pinEnabled: boolean;
  createdAt: string;
}

export interface Employer {
  id: string;
  userId: string;
  store: string;
  employerName: string;
  notes?: string;
  isActive: boolean;
  // True when this is the user's default employee — the one scoping calendar,
  // earnings and reports until another is set as default.
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Free-form: 'day' | 'night' | 'rotational' or a user-supplied custom label.
export type ShiftType = string;
export type WageRateType = 'hourly' | 'weekly' | 'monthly';

// A preset's embedded shift shape (no date — presets are time-of-day templates).
export interface ShiftLite {
  id: string;
  shiftName?: string | null;
  startTime?: string;
  endTime?: string;
  totalHours?: number;
  shiftType?: ShiftType | null;
  color?: string | null;
  employerId?: string | null;
}

// A Salary/"wage" row is the hourly rate for a shift preset. Its employee is
// auto-derived from the shift's employer.
export interface Salary {
  id: string;
  userId: string;
  shiftId?: string | null;
  employerId?: string | null;
  salary?: number | null;
  rateType?: WageRateType;
  currency?: string | null;
  hourlyPayRate?: number | null;
  shift?: ShiftLite | null;
  employer?: { id: string; store: string; employerName: string } | null;
  createdAt: string;
  updatedAt?: string;
}

// A shift is a reusable PRESET (time-of-day window + one employee, no date).
// It is assigned onto calendar days via CalendarEntry(type='shift').
export interface Shift {
  id: string;
  userId: string;
  shiftName?: string | null;
  startTime: string;
  endTime: string;
  totalHours: number;
  shiftType?: ShiftType | null;
  color?: string | null;
  employerId?: string | null;
  employer?: { id: string; store: string; employerName: string } | null;
  isManualEntry: boolean;
  notes?: string;
  salaries?: Salary[];
  createdAt?: string;
}

export type CalendarEntryType = 'event' | 'memo' | 'shift';

export interface CalendarEntry {
  id: string;
  userId: string;
  date: string;
  type: CalendarEntryType;
  title: string;
  shiftId?: string | null;
  employerId?: string | null;
  color?: string | null;
  shift?: ShiftLite | null;
  createdAt?: string;
}

export interface ClockSession {
  id: string;
  userId: string;
  employerId?: string | null;
  salaryId?: string | null;
  clockInTime: string;
  clockOutTime?: string | null;
  totalHours?: number | null;
  earnings?: number | null;
  isAutoCalculated?: boolean;
  status: 'active' | 'completed';
  notes?: string | null;
  salary?: Salary | null;
  createdAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  scheduledAt?: string;
  createdAt: string;
}

export interface PaidMonth {
  id: string;
  userId: string;
  year: number;
  month: number; // 1–12
  amount: number;
  createdAt?: string;
  updatedAt?: string;
}
