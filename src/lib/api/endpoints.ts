import {
  API_ENABLED,
  apiRequest,
  marketplaceRequest,
  type LaravelCollection,
  type LaravelResource,
} from "./client";
import { getCartToken } from "../cart-token";
import {
  mockAccountOrder,
  mockAccountOrders,
  mockAccountTickets,
  mockCreateOrder,
  mockEventDetail,
  mockHomepage,
  mockLanguages,
  mockListEvents,
  mockMenu,
  mockOrderStatus,
  mockQuote,
  mockRedirect,
  mockSeatMap,
  mockSeoSettings,
  mockStaticPage,
  mockStaticPages,
  mockTicketLookup,
  mockTicketVerify,
  mockTranslations,
  mockUser,
} from "./mock";
import type {
  ChangePasswordRequest,
  ContentPageListResource,
  ContentPageResource,
  CreateOrderRequest,
  EventListResource,
  EventResource,
  HomepageResource,
  LanguageResource,
  LoginRequest,
  MenuResource,
  OrderCreatedResult,
  OrderDetailResource,
  OrderStatusResult,
  OrderSummaryResource,
  Paginated,
  QuoteRequest,
  QuoteResult,
  RedirectResource,
  RegisterRequest,
  SeatMapResource,
  SeoSettingResource,
  TicketLookupRequest,
  TicketLookupResult,
  TicketVerifyRequest,
  TranslationsResult,
  UpdateProfileRequest,
  UserResource,
  AccountTicketResource,
} from "./types";

/**
 * `canonical_url` (`"/{tagSlug}/{eventSlug}"`, or null when the event has no
 * resolvable slug pair yet) is the one source of truth for an event's route —
 * never construct this pair any other way.
 */
export function parseEventPath(
  canonicalUrl: string | null,
): { tagSlug: string; eventSlug: string } | null {
  if (!canonicalUrl) return null;
  const segments = canonicalUrl.split("/").filter(Boolean);
  if (segments.length !== 2) return null;
  const [tagSlug, eventSlug] = segments as [string, string];
  return { tagSlug, eventSlug };
}

/* ---------------------------------------------------------------------------
 * Homepage / browse
 * ------------------------------------------------------------------------- */

export async function getHomepage(): Promise<HomepageResource> {
  if (!API_ENABLED) return mockHomepage;
  const res = await apiRequest<LaravelResource<HomepageResource>>("/homepage");
  return res.data;
}

export async function listEvents(
  page: number,
  perPage = 12,
  search = "",
): Promise<Paginated<EventListResource>> {
  if (!API_ENABLED) return mockListEvents(page, perPage, search);
  return apiRequest<Paginated<EventListResource>>("/events", {
    query: { page, per_page: perPage, search: search || undefined },
  });
}

export async function getActiveEvents(search: string): Promise<EventListResource[]> {
  if (!API_ENABLED) return mockListEvents(1, 8, search).data;
  const res = await apiRequest<LaravelCollection<EventListResource>>("/events", {
    query: { search, upcoming: 1, per_page: 8 },
  });
  return res.data;
}

export async function getEvent(tagSlug: string, eventSlug: string): Promise<EventResource> {
  if (!API_ENABLED) return mockEventDetail(tagSlug, eventSlug);
  const res = await apiRequest<LaravelResource<EventResource>>(
    `/events/${encodeURIComponent(tagSlug)}/${encodeURIComponent(eventSlug)}`,
  );
  return res.data;
}

/* ---------------------------------------------------------------------------
 * Quote / checkout
 * ------------------------------------------------------------------------- */

export async function quoteCart(eventId: number, input: QuoteRequest): Promise<QuoteResult> {
  if (!API_ENABLED) return mockQuote(eventId, input);
  // A seat's advisory hold has no requester identity without this header —
  // re-quoting seats this cart already holds would otherwise 422
  // (SEATS_OCCUPIED) against its own prior quote. Only needed when `seats`
  // is actually part of the selection.
  const hasSeats = Object.values(input.seats ?? {}).some((ids) => ids.length > 0);
  const res = await apiRequest<{ success: boolean; data: QuoteResult }>(
    `/events/${eventId}/quote`,
    {
      method: "POST",
      body: input,
      ...(hasSeats ? { headers: { "X-Cart-Token": getCartToken() } } : {}),
    },
  );
  return res.data;
}

export async function createOrder(
  eventId: number,
  input: CreateOrderRequest,
): Promise<OrderCreatedResult> {
  if (!API_ENABLED) return mockCreateOrder(eventId, input);
  return apiRequest<OrderCreatedResult>(`/events/${eventId}/orders`, {
    method: "POST",
    body: input,
  });
}

/** Public order status lookup by `payment_code` — no auth, summary only, no tickets. */
export async function getOrderStatus(paymentCode: string): Promise<OrderStatusResult> {
  if (!API_ENABLED) return mockOrderStatus(paymentCode);
  const res = await apiRequest<{ success: boolean; data: OrderStatusResult }>(
    `/orders/${encodeURIComponent(paymentCode)}`,
  );
  return res.data;
}

/* ---------------------------------------------------------------------------
 * Seat map (marketplace)
 * ------------------------------------------------------------------------- */

export async function getSeatMap(tagSlug: string, eventSlug: string): Promise<SeatMapResource> {
  if (!API_ENABLED) return mockSeatMap(tagSlug, eventSlug);
  const res = await marketplaceRequest<LaravelResource<SeatMapResource>>(
    `/events/${encodeURIComponent(tagSlug)}/${encodeURIComponent(eventSlug)}/seat-map`,
  );
  return res.data;
}

/* ---------------------------------------------------------------------------
 * Find ticket (marketplace, guest SMS-verified lookup)
 * ------------------------------------------------------------------------- */

export async function lookupTicket(input: TicketLookupRequest): Promise<TicketLookupResult> {
  if (!API_ENABLED) return mockTicketLookup(input);
  const res = await marketplaceRequest<{ success: boolean; data: TicketLookupResult }>(
    "/tickets/lookup",
    { method: "POST", body: input },
  );
  return res.data;
}

/** A wrong/expired/reused code surfaces as `422 { error: { code: "INVALID_VERIFICATION_CODE" } }`. */
export async function verifyTicket(input: TicketVerifyRequest): Promise<OrderDetailResource> {
  if (!API_ENABLED) return mockTicketVerify(input);
  const res = await marketplaceRequest<LaravelResource<OrderDetailResource>>("/tickets/verify", {
    method: "POST",
    body: input,
  });
  return res.data;
}

/* ---------------------------------------------------------------------------
 * Auth (cookie session — no bearer token)
 * ------------------------------------------------------------------------- */

export async function login(input: LoginRequest): Promise<UserResource> {
  if (!API_ENABLED) return mockUser;
  const res = await apiRequest<{ user: UserResource }>("/auth/login", {
    method: "POST",
    body: input,
  });
  return res.user;
}

export async function register(input: RegisterRequest): Promise<UserResource> {
  if (!API_ENABLED) {
    return { ...mockUser, email: input.email, first_name: input.first_name ?? mockUser.first_name };
  }
  const res = await apiRequest<{ user: UserResource }>("/auth/register", {
    method: "POST",
    body: input,
  });
  return res.user;
}

export async function logout(): Promise<void> {
  if (!API_ENABLED) return;
  await apiRequest<{ success: boolean }>("/auth/logout", { method: "POST" });
}

/** Returns `null` on 401 ("not logged in"), not an error surfaced to the user. */
export async function getCurrentUser(): Promise<UserResource | null> {
  if (!API_ENABLED) return null;
  try {
    const res = await apiRequest<LaravelResource<UserResource>>("/auth/me");
    return res.data;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------------------
 * Account (auth required)
 * ------------------------------------------------------------------------- */

export async function getAccountOrders(): Promise<Paginated<OrderSummaryResource>> {
  if (!API_ENABLED) return mockAccountOrders;
  return apiRequest<Paginated<OrderSummaryResource>>("/account/orders", {
    query: { per_page: 50 },
  });
}

export async function getAccountOrder(code: string): Promise<OrderDetailResource> {
  if (!API_ENABLED) return mockAccountOrder(code);
  const res = await apiRequest<LaravelResource<OrderDetailResource>>(
    `/account/orders/${encodeURIComponent(code)}`,
  );
  return res.data;
}

export async function getAccountTickets(): Promise<Paginated<AccountTicketResource>> {
  if (!API_ENABLED) return mockAccountTickets;
  return apiRequest<Paginated<AccountTicketResource>>("/account/tickets", {
    query: { per_page: 50 },
  });
}

export async function updateProfile(input: UpdateProfileRequest): Promise<UserResource> {
  if (!API_ENABLED) return { ...mockUser, ...input };
  const res = await apiRequest<LaravelResource<UserResource>>("/account/profile", {
    method: "PATCH",
    body: input,
  });
  return res.data;
}

/**
 * A wrong `current_password` is a 422, but NOT the standard Laravel
 * `{ message, errors }` shape `getFieldErrors` parses — it's
 * `{ success: false, error: { code: "INVALID_CURRENT_PASSWORD", message } }`.
 * Phase 8's caller needs a separate `err.payload?.error?.code` check for
 * this endpoint specifically, not `getFieldErrors`.
 */
export async function changePassword(input: ChangePasswordRequest): Promise<void> {
  if (!API_ENABLED) return;
  await apiRequest<{ success: boolean }>("/account/password", { method: "PUT", body: input });
}

/* ---------------------------------------------------------------------------
 * Content pages
 * ------------------------------------------------------------------------- */

export async function getPages(): Promise<ContentPageListResource[]> {
  if (!API_ENABLED) return mockStaticPages;
  const res = await apiRequest<LaravelCollection<ContentPageListResource>>("/pages");
  return res.data;
}

export async function getPage(slug: string): Promise<ContentPageResource> {
  if (!API_ENABLED) return mockStaticPage(slug);
  const res = await apiRequest<LaravelResource<ContentPageResource>>(
    `/pages/${encodeURIComponent(slug)}`,
  );
  return res.data;
}

/* ---------------------------------------------------------------------------
 * Marketplace surface: nav menu, redirects, sitemap is proxied server-side (Phase 10)
 * ------------------------------------------------------------------------- */

export async function getMenu(code: "main" | "footer"): Promise<MenuResource> {
  if (!API_ENABLED) return mockMenu(code);
  const res = await marketplaceRequest<LaravelResource<MenuResource>>(`/menu/${code}`);
  return res.data;
}

/** Returns `null` on 404 (no redirect on file) — callers fall through to their own 404. */
export async function lookupRedirect(path: string): Promise<RedirectResource | null> {
  if (!API_ENABLED) return mockRedirect(path);
  try {
    const res = await marketplaceRequest<LaravelResource<RedirectResource>>("/redirects/lookup", {
      query: { path },
    });
    return res.data;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------------------
 * Languages / translations / SEO settings
 * ------------------------------------------------------------------------- */

export async function getLanguages(): Promise<LanguageResource[]> {
  if (!API_ENABLED) return mockLanguages;
  const res = await apiRequest<LaravelCollection<LanguageResource>>("/languages");
  return res.data;
}

export async function getTranslations(): Promise<TranslationsResult> {
  if (!API_ENABLED) return mockTranslations;
  return apiRequest<TranslationsResult>("/translations");
}

export async function getSeoSettings(): Promise<SeoSettingResource> {
  if (!API_ENABLED) return mockSeoSettings;
  const res = await apiRequest<LaravelResource<SeoSettingResource>>("/seo-settings");
  return res.data;
}
