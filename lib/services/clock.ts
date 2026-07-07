// lib/services/clock.ts — Clock in/out + history. A session references a Salary.
import api from '@/lib/api';
import { ApiResponse, ClockSession, PaginationMeta } from '@/lib/types';

// All currently-active sessions (multiple employees can be clocked in at once).
export async function getActiveClocks(): Promise<ClockSession[]> {
  const res = await api.get<ApiResponse<ClockSession[]>>('/clock/active');
  return res.data.data ?? [];
}

export async function clockIn(salaryId: string, notes?: string): Promise<ClockSession> {
  const res = await api.post<ApiResponse<ClockSession>>('/clock/in', { salaryId, notes });
  return res.data.data as ClockSession;
}

// Clock out a specific session by id.
export async function clockOut(id: string, notes?: string): Promise<ClockSession> {
  const res = await api.post<ApiResponse<ClockSession>>(`/clock/${id}/out`, notes ? { notes } : {});
  return res.data.data as ClockSession;
}

export interface ListClockParams {
  status?: 'active' | 'completed';
  shiftId?: string;
  page?: number;
  limit?: number;
}

export async function listClock(
  params?: ListClockParams
): Promise<{ data: ClockSession[]; meta?: PaginationMeta }> {
  const res = await api.get<ApiResponse<ClockSession[]>>('/clock', { params });
  return { data: res.data.data ?? [], meta: res.data.meta };
}

export async function deleteClock(id: string): Promise<void> {
  await api.delete(`/clock/${id}`);
}
