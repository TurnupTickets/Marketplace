import { API_ENABLED, apiRequest, type LaravelCollection, type LaravelResource } from "./client";
import {
  mockAd,
  mockAllEvents,
  mockCalculateCart,
  mockCreateOrder,
  mockEventDetail,
  mockFeatured,
  mockOrder,
  mockSections,
  mockStaticPages,
  mockUpcoming,
  mockUser,
} from "./mock";
import type {
  AdBanner,
  CartRequest,
  CartTotal,
  CreateOrderInput,
  CreateOrderResult,
  CurrentUser,
  EventDetail,
  EventItem,
  EventSection,
  Order,
  Paginated,
  StaticPage,
  Ticket,
} from "./types";

/**
 * Endpoints expected from the Laravel backend:
 *
 *   GET  /events/featured          -> EventItem[]
 *   GET  /events/sections          -> EventSection[]
 *   GET  /events?search=&category= -> EventItem[]
 *   GET  /ads/home                 -> AdBanner
 *   GET  /me                       -> CurrentUser
 *   GET  /me/upcoming              -> EventItem[]
 *   GET  /tickets/{code}           -> Ticket
 */

export async function getFeaturedEvents(): Promise<EventItem[]> {
  if (!API_ENABLED) return mockFeatured;
  const res = await apiRequest<LaravelCollection<EventItem>>("/events/featured");
  return res.data;
}

export async function getEventSections(): Promise<EventSection[]> {
  if (!API_ENABLED) return mockSections;
  const res = await apiRequest<LaravelCollection<EventSection>>("/events/sections");
  return res.data;
}

export async function searchEvents(search: string): Promise<EventItem[]> {
  if (!API_ENABLED) {
    const all = mockSections.flatMap((s) => s.events);
    return all.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()));
  }
  const res = await apiRequest<LaravelCollection<EventItem>>("/events", { query: { search } });
  return res.data;
}

export async function getHomeAd(): Promise<AdBanner> {
  if (!API_ENABLED) return mockAd;
  const res = await apiRequest<LaravelResource<AdBanner>>("/ads/home");
  return res.data;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!API_ENABLED) return null;
  try {
    const res = await apiRequest<LaravelResource<CurrentUser>>("/me");
    return res.data;
  } catch {
    return null;
  }
}

export async function getMyUpcomingEvents(): Promise<EventItem[]> {
  if (!API_ENABLED) return mockUpcoming;
  const res = await apiRequest<LaravelCollection<EventItem>>("/me/upcoming");
  return res.data;
}

export async function findTicket(code: string): Promise<Ticket> {
  const res = await apiRequest<LaravelResource<Ticket>>(`/tickets/${encodeURIComponent(code)}`);
  return res.data;
}

/* ---------------------------------------------------------------------------
 * Additional endpoints expected from Laravel:
 *
 *   GET  /events?page=&per_page=&search=  -> Paginated<EventItem>
 *   GET  /events/{slug}                   -> EventDetail
 *   GET  /events/active?search=           -> EventItem[]   (search dropdown)
 *   GET  /pages/{slug}                    -> StaticPage
 *   POST /auth/login   { email, password }
 *   POST /auth/register{ email, password, name }
 *   POST /auth/forgot  { email } / POST /auth/reset { email, code, password }
 *   POST /orders/lookup { event_id, order_number } -> { phone_hint }
 *   POST /orders/verify { event_id, order_number, code } -> Order
 *   POST /cart/calculate { event_id, items, addon_ids, discount_code } -> CartTotal
 *   POST /orders { event_id, items, addon_ids, discount_code, buyer, shipping_address, consents } -> { order_number }
 * ------------------------------------------------------------------------- */

export async function listEvents(
  page: number,
  perPage = 12,
  search = "",
): Promise<Paginated<EventItem>> {
  if (!API_ENABLED) {
    const filtered = mockAllEvents.filter((e) =>
      search ? `${e.title} ${e.city ?? ""}`.toLowerCase().includes(search.toLowerCase()) : true,
    );
    const start = (page - 1) * perPage;
    return {
      data: filtered.slice(start, start + perPage),
      meta: {
        current_page: page,
        last_page: Math.max(1, Math.ceil(filtered.length / perPage)),
        per_page: perPage,
        total: filtered.length,
      },
    };
  }
  return apiRequest<Paginated<EventItem>>("/events", {
    query: { page, per_page: perPage, search: search || undefined },
  });
}

export async function getEvent(slug: string): Promise<EventDetail> {
  if (!API_ENABLED) return mockEventDetail(slug);
  const res = await apiRequest<LaravelResource<EventDetail>>(`/events/${encodeURIComponent(slug)}`);
  return res.data;
}

export async function calculateCart(input: CartRequest): Promise<CartTotal> {
  if (!API_ENABLED) return mockCalculateCart(input);
  return apiRequest<CartTotal>("/cart/calculate", { method: "POST", body: input });
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!API_ENABLED) return mockCreateOrder(input);
  return apiRequest<CreateOrderResult>("/orders", { method: "POST", body: input });
}

export async function getActiveEvents(search: string): Promise<EventItem[]> {
  if (!API_ENABLED) {
    const q = search.trim().toLowerCase();
    return mockAllEvents
      .filter((e) => (q ? `${e.title} ${e.city ?? ""}`.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }
  const res = await apiRequest<LaravelCollection<EventItem>>("/events/active", {
    query: { search },
  });
  return res.data;
}

export async function getStaticPage(slug: string): Promise<StaticPage> {
  if (!API_ENABLED) {
    const page = mockStaticPages.find((p) => p.slug === slug);
    if (!page) throw new Error("Page not found");
    return page;
  }
  const res = await apiRequest<LaravelResource<StaticPage>>(`/pages/${encodeURIComponent(slug)}`);
  return res.data;
}

export async function requestTicketCode(input: { event_id: number; order_number: string }) {
  if (!API_ENABLED) return { phone_hint: mockOrder.phone_hint };
  return apiRequest<{ phone_hint: string }>("/orders/lookup", { method: "POST", body: input });
}

export async function verifyTicketCode(input: {
  event_id: number;
  order_number: string;
  code: string;
}): Promise<Order> {
  if (!API_ENABLED) return mockOrder;
  const res = await apiRequest<LaravelResource<Order>>("/orders/verify", {
    method: "POST",
    body: input,
  });
  return res.data;
}

export async function login(input: { email: string; password: string }): Promise<CurrentUser> {
  if (!API_ENABLED) return mockUser;
  const res = await apiRequest<LaravelResource<CurrentUser>>("/auth/login", {
    method: "POST",
    body: input,
  });
  return res.data;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<CurrentUser> {
  if (!API_ENABLED) return { ...mockUser, name: input.name, email: input.email };
  const res = await apiRequest<LaravelResource<CurrentUser>>("/auth/register", {
    method: "POST",
    body: input,
  });
  return res.data;
}

export async function requestPasswordReset(email: string) {
  if (!API_ENABLED) return { ok: true };
  return apiRequest<{ ok: boolean }>("/auth/forgot", { method: "POST", body: { email } });
}

export async function resetPassword(input: { email: string; code: string; password: string }) {
  if (!API_ENABLED) return { ok: true };
  return apiRequest<{ ok: boolean }>("/auth/reset", { method: "POST", body: input });
}
