import { apiRequest, API_BASE, isApiConfigured } from '@/lib/api-client';

export { API_BASE, isApiConfigured };

export async function fetchCostDatabase(): Promise<{
  materials?: unknown[];
  labour?: unknown[];
  equipment?: unknown[];
  region?: string;
} | null> {
  return apiRequest('/cost-database', { soft: true, timeoutMs: 8000 });
}

export async function fetchHealth(): Promise<{ status: string; service?: string } | null> {
  return apiRequest('/health', { soft: true, timeoutMs: 4000 });
}
