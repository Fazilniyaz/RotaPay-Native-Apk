// lib/services/payments.ts — Marking calendar months as paid (drives shift pay tabs).
import api from '@/lib/api';
import { ApiResponse, PaidMonth } from '@/lib/types';

export type { PaidMonth };

// Paid months are per-employee. Omit employerId to use the default employee.
export async function listPaidMonths(employerId?: string): Promise<PaidMonth[]> {
  const res = await api.get<ApiResponse<PaidMonth[]>>('/payments', {
    params: employerId ? { employerId } : undefined,
  });
  return res.data.data ?? [];
}

export async function markMonthPaid(
  year: number,
  month: number,
  employerId?: string
): Promise<PaidMonth> {
  const res = await api.post<ApiResponse<PaidMonth>>('/payments/mark', {
    year,
    month,
    ...(employerId ? { employerId } : {}),
  });
  return res.data.data as PaidMonth;
}

export async function unmarkMonthPaid(
  year: number,
  month: number,
  employerId?: string
): Promise<void> {
  await api.delete('/payments', { data: { year, month, ...(employerId ? { employerId } : {}) } });
}
