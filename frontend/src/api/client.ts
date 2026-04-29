// Typed fetch wrapper — never call fetch() directly in components.
// Base URL from env var — never hardcoded.

const BASE_URL = import.meta.env.VITE_API_URL as string;

const TIMEOUT_MS = 10_000;

interface ApiSuccess<T> {
  data: T;
  error: null;
  status: number;
}

interface ApiError {
  data: null;
  error: {
    message: string;
    errors?: { field: string; message: string }[];
  };
  status: number;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

async function fetchWithTimeout(
  url: string,
  options: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseErrorBody(
  response: Response
): Promise<{ message: string; errors?: { field: string; message: string }[] }> {
  try {
    const body = await response.json();
    return {
      message: body.error ?? body.message ?? `HTTP ${response.status}`,
      errors: body.errors,
    };
  } catch {
    return { message: `HTTP ${response.status}` };
  }
}

// GET with retry: up to 3 attempts on network failure (not on 4xx/5xx)
// Exponential backoff: 500ms, 1000ms, 2000ms
async function getWithRetry<T>(url: string): Promise<ApiResult<T>> {
  const delays = [500, 1000, 2000];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await parseErrorBody(response);
        // Do NOT retry on 4xx/5xx — only on network-level failures
        return { data: null, error, status: response.status };
      }

      const data: T = await response.json();
      return { data, error: null, status: response.status };
    } catch (err) {
      // Network-level failure (fetch throws) — retry if attempts remain
      if (attempt < delays.length) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        continue;
      }
      // All retries exhausted
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      return {
        data: null,
        error: {
          message: isAbort
            ? 'Request timed out. Please try again.'
            : 'Could not reach the server. Please check your connection and try again.',
        },
        status: 0,
      };
    }
  }

  // Unreachable but TypeScript needs it
  return {
    data: null,
    error: { message: 'Unknown error' },
    status: 0,
  };
}

// POST — single attempt only, NO automatic retry. Idempotency handles safety.
async function post<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok && response.status !== 200) {
      // 200 is valid (idempotent replay)
      const error = await parseErrorBody(response);
      return { data: null, error, status: response.status };
    }

    const data: T = await response.json();
    return { data, error: null, status: response.status };
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    return {
      data: null,
      error: {
        message: isAbort
          ? 'Request timed out. Please try again.'
          : 'Could not reach the server. Please check your connection and try again.',
      },
      status: 0,
    };
  }
}

export const apiClient = {
  get: <T>(path: string): Promise<ApiResult<T>> =>
    getWithRetry<T>(`${BASE_URL}${path}`),

  post: <T>(path: string, body: unknown): Promise<ApiResult<T>> =>
    post<T>(`${BASE_URL}${path}`, body),
};
