/**
 * TurnupCms REST API client.
 *
 * Configure the backend's bare origin with VITE_API_URL (e.g. http://localhost:8080,
 * no trailing path — `api/v1`, `api/marketplace/v1`, and `sanctum/csrf-cookie` are
 * three siblings off this origin, not nested under one shared prefix). Until it's
 * set, the app falls back to local mock data (see ./mock.ts).
 */

import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestUrl } from "@tanstack/react-start/server";

const API_ORIGIN = import.meta.env["VITE_API_URL"] ?? "";
export const API_ENABLED = API_ORIGIN.length > 0;

/**
 * `cover_url`/`gallery_urls` (Spatie Media Library's `getFirstMediaUrl()`)
 * come back as server-relative paths (`/storage/...`), not absolute URLs —
 * resolving them against the frontend's own origin (the browser's default
 * for a bare `/...` src) would 404 since the media actually lives on the
 * API origin. Already-absolute URLs (mock data, or if the backend changes
 * this later) pass through untouched.
 */
export function resolveMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  return `${API_ORIGIN}${path}`;
}

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
  /** Extra headers merged in on top of the defaults (Accept/Content-Type/CSRF). */
  headers?: Record<string, string>;
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
 * Server-side (SSR loaders on a full page load — including the full reload
 * Vite triggers after certain frontend file edits) runs in Node, which has
 * no browser cookie jar: `fetch(..., { credentials: 'include' })` sends
 * nothing there. Without this, every SSR call hits the backend anonymously
 * and `currentUserQuery()` looks logged-out even though the browser's
 * session cookie is fine — the bug reads as "session dies on reload".
 *
 * Two things need forwarding from the incoming request, not just the
 * session cookie:
 * - `Cookie` — the actual credential.
 * - `Origin` — Sanctum's `EnsureFrontendRequestsAreStateful::fromFrontend()`
 *   only treats a request as stateful (cookie-authenticated) if its
 *   `Referer`/`Origin` matches `SANCTUM_STATEFUL_DOMAINS`; Node's fetch
 *   doesn't set one on its own, so without this the backend would fall
 *   back to token auth (which doesn't exist here) even with the cookie
 *   attached.
 *
 * `createIsomorphicFn` is the framework's compiler-recognized way to keep
 * `@tanstack/react-start/server` (server-only, Node) out of the browser
 * bundle — a plain runtime `typeof window` guard around a static import
 * still trips Vite's import-protection plugin at build time. `.client()`
 * supplies the no-op used when this same shared module is bundled for the
 * browser. try/catch covers the case where the server impl runs outside an
 * active request context (e.g. module init), where
 * `getRequestHeader`/`getRequestUrl` throw.
 */
const getSsrForwardHeaders = createIsomorphicFn()
  .server((): Record<string, string> => {
    try {
      const headers: Record<string, string> = {};
      const cookie = getRequestHeader("cookie");
      if (cookie) headers["Cookie"] = cookie;
      const url = getRequestUrl();
      if (url) headers["Origin"] = url.origin;
      return headers;
    } catch {
      return {};
    }
  })
  .client((): Record<string, string> => ({}));

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
    ...getSsrForwardHeaders(),
    ...options.headers,
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

export type ApiDomainErrorPayload = { success: false; error: { code: string; message: string } };

function isApiDomainError(payload: unknown): payload is ApiDomainErrorPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as { error: unknown }).error === "object" &&
    (payload as { error: { message?: unknown } }).error !== null &&
    typeof (payload as { error: { message?: unknown } }).error.message === "string"
  );
}

/**
 * The backend's other JSON error shape — every `OrderException` subclass
 * (`INSUFFICIENT_TICKETS`, `SEATS_OCCUPIED`, `ORDER_ALREADY_PAID`,
 * `PURCHASE_IN_PROGRESS`, ...) and similar domain exceptions respond
 * `{ success: false, error: { code, message } }` rather than Laravel's
 * validation-error shape `getFieldErrors` parses. Any status code (409 and
 * 422 both use it) — check `err.status` yourself first if you need to
 * branch by code, e.g. `parseOccupiedSeatIds` does for `SEATS_OCCUPIED`.
 * Returns null when the payload doesn't match, so callers can fall back to
 * a generic message.
 */
export function getDomainErrorMessage(err: unknown): string | null {
  if (!(err instanceof ApiError) || !isApiDomainError(err.payload)) return null;
  return err.payload.error.message;
}

/**
 * Machine-readable code from the same `{ error: { code } }` shape
 * `getDomainErrorMessage` reads — null when the payload doesn't match.
 */
export function getDomainErrorCode(err: unknown): string | null {
  if (!(err instanceof ApiError) || !isApiDomainError(err.payload)) return null;
  return err.payload.error.code;
}
