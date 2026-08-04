import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  calculateCart,
  getCurrentUser,
  getEventSections,
  getFeaturedEvents,
  getHomeAd,
  getMyUpcomingEvents,
  listEvents,
  getEvent,
  getStaticPage,
  getActiveEvents,
} from "./endpoints";
import type { CartRequest } from "./types";

export const featuredEventsQuery = () =>
  queryOptions({ queryKey: ["events", "featured"], queryFn: getFeaturedEvents });

export const eventSectionsQuery = () =>
  queryOptions({ queryKey: ["events", "sections"], queryFn: getEventSections });

export const homeAdQuery = () => queryOptions({ queryKey: ["ads", "home"], queryFn: getHomeAd });

export const currentUserQuery = () => queryOptions({ queryKey: ["me"], queryFn: getCurrentUser });

export const myUpcomingQuery = () =>
  queryOptions({ queryKey: ["me", "upcoming"], queryFn: getMyUpcomingEvents });

export const eventsPageQuery = (page: number, search = "") =>
  queryOptions({
    queryKey: ["events", "list", page, search],
    queryFn: () => listEvents(page, 12, search),
  });

export const eventDetailQuery = (slug: string) =>
  queryOptions({ queryKey: ["events", "detail", slug], queryFn: () => getEvent(slug) });

export const staticPageQuery = (slug: string) =>
  queryOptions({ queryKey: ["pages", slug], queryFn: () => getStaticPage(slug) });

export const activeEventsQuery = (search: string) =>
  queryOptions({ queryKey: ["events", "active", search], queryFn: () => getActiveEvents(search) });

export const cartTotalQuery = (cart: CartRequest) =>
  queryOptions({
    queryKey: ["cart", cart],
    queryFn: () => calculateCart(cart),
    placeholderData: keepPreviousData,
  });
