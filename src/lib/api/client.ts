/**
 * Laravel REST API client.
 *
 * Configure the backend base URL with VITE_API_URL (e.g. https://api.turnup.pl/api).
 * Until it's set, the app falls back to local mock data (see ./mock.ts).
 */

export const API_BASE_URL = import.meta.env["VITE_API_URL"] ?? "";
export const API_ENABLED = API_BASE_URL.length > 0;

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

let authToken: string | null = null;

/** Sanctum / Passport bearer token used for authenticated Laravel endpoints. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal } = options;

  const url = new URL(`${API_BASE_URL}${path}`, API_BASE_URL || window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method,
    signal: signal ?? null,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
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
