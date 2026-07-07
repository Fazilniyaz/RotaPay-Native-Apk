// lib/services/employers.ts — CRUD for the Employer ("employee") resource.
// api baseURL already includes `/api`, so paths here omit it.
import api from '@/lib/api';
import { ApiResponse, Employer, PaginationMeta } from '@/lib/types';

export interface EmployerInput {
  store: string;
  employerName: string;
  notes?: string;
  isActive?: boolean;
}

export interface ListEmployersParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export async function listEmployers(
  params?: ListEmployersParams
): Promise<{ data: Employer[]; meta?: PaginationMeta; defaultEmployerId?: string | null }> {
  const res = await api.get<ApiResponse<Employer[]>>('/employers', { params });
  return {
    data: res.data.data ?? [],
    meta: res.data.meta,
    defaultEmployerId: (res.data.meta as { defaultEmployerId?: string | null } | undefined)
      ?.defaultEmployerId ?? null,
  };
}

// Make an employee the default (scopes calendar / earnings / reports).
export async function setDefaultEmployer(id: string): Promise<Employer> {
  const res = await api.patch<ApiResponse<Employer>>(`/employers/${id}/set-default`);
  return res.data.data as Employer;
}

export async function createEmployer(input: EmployerInput): Promise<Employer> {
  const res = await api.post<ApiResponse<Employer>>('/employers', input);
  return res.data.data as Employer;
}

export async function updateEmployer(id: string, input: Partial<EmployerInput>): Promise<Employer> {
  const res = await api.patch<ApiResponse<Employer>>(`/employers/${id}`, input);
  return res.data.data as Employer;
}

export async function deleteEmployer(id: string): Promise<void> {
  await api.delete(`/employers/${id}`);
}
