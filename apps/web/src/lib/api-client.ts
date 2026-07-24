/**
 * Centralized API configuration.
 * Base URL is controlled only by environment variables — never hardcode hosts in feature code.
 *
 * Development (default): http://localhost:4000/api
 * Production: set NEXT_PUBLIC_API_URL on the Vercel web project, e.g.
 *   https://boq-generator-api-5nz3.vercel.app/api
 */

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Resolved once at module load (NEXT_PUBLIC_* is inlined at build time). */
export const API_BASE = normalizeBase(
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000/api'),
);

export function isApiConfigured(): boolean {
  return API_BASE.length > 0;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
};

/**
 * Single fetch wrapper for all backend calls.
 * Returns null on network failure when `soft` is true (used for optional sync).
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions & { soft?: boolean } = {},
): Promise<T | null> {
  if (!isApiConfigured()) {
    if (options.soft) return null;
    throw new ApiError(
      'API URL is not configured. Set NEXT_PUBLIC_API_URL in the Vercel project environment.',
    );
  }

  const pathPart = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${pathPart}`;
  const timeoutMs = options.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.body
        ? { 'Content-Type': 'application/json', Accept: 'application/json' }
        : { Accept: 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => undefined);
      }
      if (options.soft) return null;
      throw new ApiError(
        `API request failed (${res.status}) for ${pathPart}`,
        res.status,
        body,
      );
    }

    if (res.status === 204) return null;
    return (await res.json()) as T;
  } catch (err) {
    if (options.soft) return null;
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(`API request timed out after ${timeoutMs}ms`);
    }
    throw new ApiError(
      err instanceof Error ? err.message : 'Network request failed',
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}
