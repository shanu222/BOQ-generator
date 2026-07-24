export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export async function fetchCostDatabase(): Promise<{
  materials?: unknown[];
  labour?: unknown[];
  equipment?: unknown[];
} | null> {
  try {
    const res = await fetch(`${API_BASE}/cost-database`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
