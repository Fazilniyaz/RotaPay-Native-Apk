// lib/services/calendar.ts — CRUD for calendar entries (day notes, optionally shift-linked).
import api from '@/lib/api';
import { ApiResponse, CalendarEntry, CalendarEntryType } from '@/lib/types';

export interface CalendarInput {
  date: string; // ISO
  type: CalendarEntryType;
  title: string; // ≤ 15 words
  shiftId?: string | null;
  employerId?: string | null;
  color?: string | null;
}

export async function listCalendar(params?: {
  from?: string;
  to?: string;
  employerId?: string;
}): Promise<CalendarEntry[]> {
  const res = await api.get<ApiResponse<CalendarEntry[]>>('/calendar', { params });
  return res.data.data ?? [];
}

export async function createCalendarEntry(input: CalendarInput): Promise<CalendarEntry> {
  const res = await api.post<ApiResponse<CalendarEntry>>('/calendar', input);
  return res.data.data as CalendarEntry;
}

export async function updateCalendarEntry(
  id: string,
  input: Partial<CalendarInput>
): Promise<CalendarEntry> {
  const res = await api.patch<ApiResponse<CalendarEntry>>(`/calendar/${id}`, input);
  return res.data.data as CalendarEntry;
}

export async function deleteCalendarEntry(id: string): Promise<void> {
  await api.delete(`/calendar/${id}`);
}
