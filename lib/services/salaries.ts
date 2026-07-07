// lib/services/salaries.ts — CRUD for the Salary resource (links shift + employer + value).
import api from '@/lib/api';
import { ApiResponse, Salary, PaginationMeta } from '@/lib/types';

export interface CreateSalaryInput {
  shiftId?: string | null;
  // Employee is auto-derived from the shift's employer — not sent here.
  // The hourly rate. Per-day/total pay is derived server-side as
  // hourlyPayRate × the linked shift's totalHours.
  hourlyPayRate: number;
  rateType?: 'hourly';
  currency?: string;
}

export interface UpdateSalaryInput {
  shiftId?: string | null;
  hourlyPayRate?: number;
  rateType?: 'hourly';
  currency?: string | null;
}

export interface ListSalariesParams {
  shiftId?: string;
  employerId?: string;
  page?: number;
  limit?: number;
}

export async function listSalaries(
  params?: ListSalariesParams
): Promise<{ data: Salary[]; meta?: PaginationMeta }> {
  const res = await api.get<ApiResponse<Salary[]>>('/salaries', { params });
  return { data: res.data.data ?? [], meta: res.data.meta };
}

export async function createSalary(input: CreateSalaryInput): Promise<Salary> {
  const res = await api.post<ApiResponse<Salary>>('/salaries', input);
  return res.data.data as Salary;
}

export async function updateSalary(id: string, input: UpdateSalaryInput): Promise<Salary> {
  const res = await api.patch<ApiResponse<Salary>>(`/salaries/${id}`, input);
  return res.data.data as Salary;
}

export async function deleteSalary(id: string): Promise<void> {
  await api.delete(`/salaries/${id}`);
}
