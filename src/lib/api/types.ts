export type EventCategory = {
  id: number;
  slug: string;
  name: string;
};

export type EventItem = {
  id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  city?: string | null;
  venue?: string | null;
  starts_at?: string | null;
  price_from?: number | null;
  currency?: string;
  cover_url: string;
  category?: EventCategory | null;
  featured?: boolean;
};

export type EventSection = {
  id: number;
  label: string;
  events: EventItem[];
};

export type AdBanner = {
  id: number;
  image_url: string;
  target_url: string;
  alt: string;
};

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
};

export type Ticket = {
  id: number;
  code: string;
  event: EventItem;
  status: "valid" | "used" | "refunded";
};

export type TicketGroup = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  service_fee?: number | null;
  currency?: string;
  available?: boolean;
};

export type EventAddon = {
  id: number;
  label: string;
  description?: string | null;
  price: number;
  requires_shipping_address?: boolean;
};

export type OrderBuyer = {
  first_name: string;
  last_name: string;
  email: string;
  phone_country_code: string;
  phone_number: string;
  notes?: string | null;
};

export type ShippingAddress = {
  city: string;
  postal_code: string;
  street: string;
  house_number: string;
};

export type CreateOrderInput = CartRequest & {
  buyer: OrderBuyer;
  shipping_address?: ShippingAddress | null;
  consents: { terms: boolean; privacy: boolean };
};

export type CreateOrderResult = {
  order_number: string;
};

export type CartRequest = {
  event_id: number;
  items: { group_id: number; qty: number }[];
  addon_ids: number[];
  discount_code?: string | null;
};

export type CartTotal = {
  ticket_count: number;
  subtotal: number;
  addons_total: number;
  discount_amount: number;
  discount_valid?: boolean;
  discount_error?: string | null;
  total: number;
};

export type EventDetail = EventItem & {
  description?: string | null;
  date_label?: string | null;
  venue_address?: string | null;
  venue_lat?: number | null;
  venue_lng?: number | null;
  ticket_groups: TicketGroup[];
  addons: EventAddon[];
};

export type Paginated<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export type StaticPage = {
  id: number;
  slug: string;
  title: string;
  /** WYSIWYG HTML content from the CMS, rendered as-is. */
  content_html: string;
  updated_at?: string | null;
};

export type OrderTicket = {
  id: number;
  code: string;
  group_name: string;
  holder?: string | null;
  event: EventItem;
  status: "valid" | "used" | "refunded";
};

export type Order = {
  id: number;
  number: string;
  email?: string | null;
  phone_hint?: string | null;
  tickets: OrderTicket[];
};
