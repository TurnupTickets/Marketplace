import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  getAccountOrder,
  getAccountOrders,
  getAccountTickets,
  getActiveEvents,
  getCurrentUser,
  getEvent,
  getHomepage,
  getLanguages,
  getMenu,
  getPage,
  getPages,
  getSeatMap,
  getSeoSettings,
  getTranslations,
  listEvents,
  lookupRedirect,
} from "./endpoints";

export const homepageQuery = () => queryOptions({ queryKey: ["homepage"], queryFn: getHomepage });

export const currentUserQuery = () => queryOptions({ queryKey: ["me"], queryFn: getCurrentUser });

export const eventsPageQuery = (page: number, search = "") =>
  queryOptions({
    queryKey: ["events", "list", page, search],
    queryFn: () => listEvents(page, 12, search),
    placeholderData: keepPreviousData,
  });

export const eventDetailQuery = (tagSlug: string, eventSlug: string) =>
  queryOptions({
    queryKey: ["events", "detail", tagSlug, eventSlug],
    queryFn: () => getEvent(tagSlug, eventSlug),
  });

export const seatMapQuery = (tagSlug: string, eventSlug: string) =>
  queryOptions({
    queryKey: ["events", "seat-map", tagSlug, eventSlug],
    queryFn: () => getSeatMap(tagSlug, eventSlug),
  });

export const activeEventsQuery = (search: string) =>
  queryOptions({ queryKey: ["events", "active", search], queryFn: () => getActiveEvents(search) });

export const accountOrdersQuery = () =>
  queryOptions({ queryKey: ["account", "orders"], queryFn: getAccountOrders });

export const accountOrderQuery = (code: string) =>
  queryOptions({ queryKey: ["account", "orders", code], queryFn: () => getAccountOrder(code) });

export const accountTicketsQuery = () =>
  queryOptions({ queryKey: ["account", "tickets"], queryFn: getAccountTickets });

export const menuQuery = (code: "main" | "footer") =>
  queryOptions({ queryKey: ["marketplace", "menu", code], queryFn: () => getMenu(code) });

export const pagesQuery = () => queryOptions({ queryKey: ["pages"], queryFn: getPages });

export const staticPageQuery = (slug: string) =>
  queryOptions({ queryKey: ["pages", slug], queryFn: () => getPage(slug) });

export const languagesQuery = () =>
  queryOptions({ queryKey: ["languages"], queryFn: getLanguages });

export const translationsQuery = () =>
  queryOptions({ queryKey: ["translations"], queryFn: getTranslations });

export const seoSettingsQuery = () =>
  queryOptions({ queryKey: ["seo-settings"], queryFn: getSeoSettings });

export const redirectLookupQuery = (path: string) =>
  queryOptions({
    queryKey: ["marketplace", "redirect", path],
    queryFn: () => lookupRedirect(path),
  });
