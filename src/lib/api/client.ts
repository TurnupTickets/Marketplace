/**
 * TurnupCms REST API client.
 *
 * Configure the backend's bare origin with VITE_API_URL (e.g. http://localhost:8080,
 * no trailing path — `api/v1`, `api/marketplace/v1`, and `sanctum/csrf-cookie` are
 * three siblings off this origin, not nested under one shared prefix). Until it's
 * set, the app falls back to local mock data (see ./mock.ts).
 */

const API_ORIGIN = import.meta.env["VITE_API_URL"] ?? "";
export const API_ENABLED = API_ORIGIN.length > 0;

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
};

/**
 * Sanctum SPA cookie auth needs one `GET /sanctum/csrf-cookie` (with
 * `credentials: 'include'`) per browser session before the first mutating
 * request — it sets the `XSRF-TOKEN` cookie the server then expects back
 * as an `X-XSRF-TOKEN` header on `auth/*`/`account/*` writes. Memoized so
 * a burst of early mutations only primes it once.
 */
let csrfCookiePromise: Promise<void> | null = null;

function ensureCsrfCookie(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!csrfCookiePromise) {
    csrfCookiePromise = fetch(`${API_ORIGIN}/sanctum/csrf-cookie`, {
      credentials: "include",
    }).then(() => undefined);
  }
  return csrfCookiePromise;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * CSRF is only enforced on `api/v1/auth/*` and `api/v1/account/*` mutations
 * — every other route (marketplace, public event/page reads, guest
 * checkout) is stateless and doesn't need the header.
 */
function needsCsrf(prefix: string, method: string, path: string): boolean {
  if (method === "GET") return false;
  if (prefix !== "/api/v1") return false;
  return path.startsWith("/auth/") || path.startsWith("/account/");
}

async function request<T>(
  prefix: "/api/v1" | "/api/marketplace/v1",
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, signal } = options;

  const url = new URL(`${API_ORIGIN}${prefix}${path}`, API_ORIGIN || window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(body ? { "Content-Type": "application/json" } : {}),
  };

  if (needsCsrf(prefix, method, path)) {
    await ensureCsrfCookie();
    const xsrfToken = readCookie("XSRF-TOKEN");
    if (xsrfToken) headers["X-XSRF-TOKEN"] = xsrfToken;
  }

  const response = await fetch(url.toString(), {
    method,
    signal: signal ?? null,
    credentials: "include",
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      /* empty body */
    }
    throw new ApiError(response.status, `Request failed: ${response.status}`, payload);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** `api/v1/*` — the original shared surface (events, checkout, accounts, auth, pages...). */
export function apiRequest<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>("/api/v1", path, options);
}

/** `api/marketplace/v1/*` — genuinely-new endpoints per the three-surface-architecture convention. */
export function marketplaceRequest<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>("/api/marketplace/v1", path, options);
}

/** Laravel resource collections come wrapped in { data: [...] }. */
export type LaravelCollection<T> = { data: T[]; meta?: Record<string, unknown> };
export type LaravelResource<T> = { data: T };

/**
 * Laravel's standard 422 validation-error body: `{ message, errors: { field: string[] } }`.
 * Field keys may be dotted for nested payloads (e.g. `buyer.email`, `shipping_address.city`).
 */
export type LaravelValidationErrors = { message: string; errors: Record<string, string[]> };

function isLaravelValidationErrors(payload: unknown): payload is LaravelValidationErrors {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "errors" in payload &&
    typeof (payload as { errors: unknown }).errors === "object"
  );
}

/**
 * Extracts a flat `{ field: message }` map from a caught error, keyed by the
 * last dotted segment (so `buyer.email` -> `email`, `shipping_address.city` -> `city`).
 * Returns null for non-422 or non-validation errors, so callers can fall back
 * to a generic error message.
 */
export function getFieldErrors(err: unknown): Record<string, string> | null {
  if (!(err instanceof ApiError) || err.status !== 422 || !isLaravelValidationErrors(err.payload)) {
    return null;
  }
  const fieldErrors: Record<string, string> = {};
  for (const [key, messages] of Object.entries(err.payload.errors)) {
    const shortKey = key.split(".").pop() ?? key;
    const message = messages[0];
    if (message) fieldErrors[shortKey] = message;
  }
  return fieldErrors;
}
