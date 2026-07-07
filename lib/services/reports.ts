// lib/services/reports.ts — Report generation (backend computes + stores the snapshot;
// the client turns it into Excel/CSV/PDF files — see lib/reportExport.ts).
import api from '@/lib/api';
import { ApiResponse, PaginationMeta } from '@/lib/types';

export interface ReportData {
  id?: string;
  period: { start: string; end: string; months: number };
  currency: string;
  nativeCurrency: string;
  rate: number | null;
  totals: {
    shifts: number;
    hours: number;
    earned: number;
    nativeEarned: number | null;
    wages: number;
    paidTotal: number;
  };
  shifts: { date: string; name: string; type: string; hours: number; earned: number }[];
  wages: { shift: string; employee: string; rateType: string; currency: string; value: number }[];
  payments: { month: number; year: number; label: string; amount: number }[];
}

export interface ReportSummary {
  id: string;
  months: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

// Generate a report for the last `months` (defaults to the user's setting).
export async function generateReport(months?: number): Promise<ReportData> {
  const res = await api.post<ApiResponse<ReportData>>('/reports/generate', months ? { months } : {});
  return res.data.data as ReportData;
}

export async function listReports(): Promise<{ data: ReportSummary[]; meta?: PaginationMeta }> {
  const res = await api.get<ApiResponse<ReportSummary[]>>('/reports');
  return { data: res.data.data ?? [], meta: res.data.meta };
}

export async function getReport(id: string): Promise<ReportData> {
  const res = await api.get<ApiResponse<ReportData>>(`/reports/${id}`);
  return res.data.data as ReportData;
}
