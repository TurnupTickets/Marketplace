/**
 * A random per-cart identity sent as `X-Cart-Token` on quote calls that
 * include `seats` — the backend's advisory seat hold (15min, per seat) has
 * no requester identity without it, so a cart re-quoting its own already-held
 * seats (checkout-summary revalidation, a refresh, browser back/forward)
 * gets wrongly rejected with `422 SEATS_OCCUPIED`. With a stable token,
 * re-quoting seats *this* cart already holds always succeeds; a genuinely
 * different cart trying the same seat still correctly 422s.
 */

const STORAGE_KEY = "turnup:cart-token";

let memoryToken: string | null = null;

export function getCartToken(): string {
  if (memoryToken) return memoryToken;

  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        memoryToken = stored;
        return stored;
      }
    } catch {
      /* localStorage unavailable (private mode, etc.) — fall through to memory-only */
    }
  }

  const token = crypto.randomUUID();
  memoryToken = token;
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* memory-only for this page load is still correct, just doesn't survive a reload */
  }
  return token;
}
