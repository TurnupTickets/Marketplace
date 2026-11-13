import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { quoteCart } from "@/lib/api/endpoints";
import type { QuoteRequest } from "@/lib/api/types";

/**
 * Debounced live pricing — the backend has no static addon/discount price
 * list, so this quote call is the only correct source of truth for the
 * running total. Debounces ~300ms so a qty/checkbox/discount-code change
 * doesn't fire a request per interaction; only re-queries once `tickets`
 * has at least one positive quantity.
 */
/**
 * A 4xx quote (bad discount code, sold out, seats taken) is a deterministic
 * answer, not a transient failure — retrying it just leaves the UI on
 * "Liczenie…" for several seconds before the error can be shown.
 */
export function retryQuote(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 3;
}

export function useQuote(eventId: number, request: QuoteRequest) {
  const key = JSON.stringify(request);
  const [debounced, setDebounced] = useState(request);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(request), 300);
    return () => clearTimeout(id);
    // `key` (a stable serialization of `request`) is the real dependency —
    // `request` itself gets a new object reference every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const hasTickets = Object.values(debounced.tickets).some((qty) => qty > 0);
  // `debounced` hasn't caught up to the latest `request` yet — the query
  // (if any) still reflects a stale selection. Callers should treat the
  // quote as not-yet-trustworthy while this is true, same as `isFetching`.
  const isDebouncing = key !== JSON.stringify(debounced);

  const query = useQuery({
    queryKey: ["quote", eventId, debounced],
    queryFn: () => quoteCart(eventId, debounced),
    enabled: hasTickets,
    placeholderData: keepPreviousData,
    retry: retryQuote,
  });

  return { ...query, isDebouncing, hasTickets };
}
