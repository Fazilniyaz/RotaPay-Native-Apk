// lib/services/shifts.ts — CRUD + analytics for the Shift resource.
import api from '@/lib/api';
import { ApiResponse, Shift, ShiftType, PaginationMeta } from '@/lib/types';

export interface CreateShiftInput {
  shiftName?: string;
  // Time-of-day only (built against an arbitrary day — a preset has no date).
  startTime: string; // ISO
  endTime: string; // ISO
  totalHours?: number; // derived server-side; optional
  shiftType: ShiftType;
  color?: string;
  // The employee this preset is allocated to (required).
  employerId: string;
  notes?: string;
}

export type UpdateShiftInput = Partial<CreateShiftInput>;

export interface ListShiftsParams {
  search?: string;
  employerId?: string;
  shiftType?: ShiftType;
  page?: number;
  limit?: number;
}

export async function listShifts(
  params?: ListShiftsParams
): Promise<{ data: Shift[]; meta?: PaginationMeta }> {
  const res = await api.get<ApiResponse<Shift[]>>('/shifts', { params });
  return { data: res.data.data ?? [], meta: res.data.meta };
}

export async function getShift(id: string): Promise<Shift> {
  const res = await api.get<ApiResponse<Shift>>(`/shifts/${id}`);
  return res.data.data as Shift;
}

export interface ShiftAnalytics {
  totalHours: number;
  thisMonthHours: number;
  totalPay: number;
  thisMonthPay: number;
}

// Analytics are per-employee. Omit employerId to use the default employee.
export async function getShiftAnalytics(employerId?: string): Promise<ShiftAnalytics> {
  const res = await api.get<ApiResponse<ShiftAnalytics>>('/shifts/analytics', {
    params: employerId ? { employerId } : undefined,
  });
  return res.data.data as ShiftAnalytics;
}

export async function createShift(input: CreateShiftInput): Promise<Shift> {
  const res = await api.post<ApiResponse<Shift>>('/shifts', input);
  return res.data.data as Shift;
}

export async function updateShift(id: string, input: UpdateShiftInput): Promise<Shift> {
  const res = await api.patch<ApiResponse<Shift>>(`/shifts/${id}`, input);
  return res.data.data as Shift;
}

export async function deleteShift(id: string): Promise<void> {
  await api.delete(`/shifts/${id}`);
}
