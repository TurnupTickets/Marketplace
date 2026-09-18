/**
 * Types mirror TurnupCms's real API resources field-for-field (verified
 * against controller/resource source, not just the OpenAPI snapshot —
 * Scramble mis-infers several response shapes). One type per backend
 * resource, named to match, so a diff against the source is direct.
 */

export type Tag = { id: number; name: string; slug: string };

/* ---------------------------------------------------------------------------
 * Events (api/v1)
 * ------------------------------------------------------------------------- */

export type EventListResource = {
  id: number;
  name: string;
  featured: boolean;
  city: string;
  date_from: string;
  date_to: string;
  currency: string;
  canonical_url: string | null;
  cover_url: string | null;
  primary_tag: Tag | null;
};

/** `App\Enums\Statuses\TicketGroupStatus`: int-backed enum, serializes as its integer value, not a string. */
export type TicketGroupStatus = 0 | 1 | 2;
export const TICKET_GROUP_STATUS = { CLOSED: 0, ACTIVE: 1, DRAFT: 2 } as const;

export type EventTicketGroupSummary = {
  id: number;
  name: string;
  /** Laravel decimal cast serializes as a string, not a number. */
  price: string;
  currency: string;
  available_count: number;
  status: TicketGroupStatus;
};

export type EventResource = {
  id: number;
  name: string;
  description: string | null;
  city: string;
  street: string;
  place: string;
  date_from: string;
  date_to: string;
  currency: string;
  canonical_url: string | null;
  cover_url: string | null;
  gallery_urls: string[];
  /** Null when the event's address was never geocoded in the admin — detail endpoint only, not on the list resource. */
  lat: number | null;
  lng: number | null;
  primary_tag: Tag | null;
  ticket_groups: EventTicketGroupSummary[];
};

export type HomepageTagSlider = { tag: Tag; events: EventListResource[] };
export type HomepageResource = { featured: EventListResource[]; tag_sliders: HomepageTagSlider[] };

export type PaginatedLinks = {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
};

export type PaginatedMeta = {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
};

export type Paginated<T> = { data: T[]; links: PaginatedLinks; meta: PaginatedMeta };

/* ---------------------------------------------------------------------------
 * Quote / checkout (api/v1)
 * ------------------------------------------------------------------------- */

/** `{ "<ticket_group_id>": qty }` — a keyed map, not an array of pairs. */
export type TicketSelection = Record<number, number>;
/** `{ "<ticket_group_id>": [seat_id, ...] }`. */
export type SeatSelection = Record<number, number[]>;

export type QuoteRequest = {
  tickets: TicketSelection;
  seats?: SeatSelection;
  discount?: string | null;
  sms?: 0 | 1;
  delivery?: 0 | 1;
  ticket_as_gift?: 0 | 1;
  additional_cost_params?: string[];
};

export type QuoteTicketGroupBreakdown = {
  ticket_group_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

/** `App\Http\Resources\Api\V1\QuoteResource` — the only place addon/discount pricing exists. */
export type QuoteResult = {
  currency: string;
  ticket_groups: QuoteTicketGroupBreakdown[];
  subtotal: number;
  discount_amount: number;
  discount: { code: string; info: string } | null;
  additional_costs: {
    delivery: number;
    gift: number;
    sms: number;
    additional_cost_params: number;
  };
  service_amount: number;
  total: number;
};

export type CreateOrderRequest = QuoteRequest & {
  rodo: boolean;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  dial_code: string;
  city?: string | null;
  city_code?: string | null;
  street_number?: string | null;
  comments?: string | null;
};

/** `App\Http\Resources\Api\V1\OrderCreatedResource` — 201 response. */
export type OrderCreatedResult = { success: boolean; payment_url: string; order_id: number };

/** `App\Enums\Statuses\PaymentStatus`: -1 CANCELLED, 0 PENDING, 1 PAID_MANUAL, 2 PAID — no "refunded" case exists. */
export type PaymentStatus = -1 | 0 | 1 | 2;

/** `App\Http\Resources\Api\V1\OrderStatusResource` — public `GET /orders/{code}`, summary only, no tickets. */
export type OrderStatusResult = {
  payment_code: string | null;
  status: PaymentStatus;
  total: number;
  currency: string | null;
  event_name: string | null;
  expiration_date: string | null;
};

/* ---------------------------------------------------------------------------
 * Seat map (api/marketplace/v1)
 * ------------------------------------------------------------------------- */

export type SeatMapSeat = {
  /** Purchase-flow id — this, not `real_id`, is what quote/order's `seats` map expects. */
  id: number;
  /** Display-only identifier used to key into the SVG/grid overlay. */
  real_id: string;
  section: string | null;
  row: string | null;
  number: string | null;
  ticket_group_id: number | null;
  status: string | null;
  sold: boolean;
  color: string | null;
};

export type SeatMapTicketGroup = { id: number; name: string; color: string | null };

export type SeatMapResource =
  | { type: "none" }
  | {
      type: "scheme";
      svg: string | null;
      seats: SeatMapSeat[];
      ticket_groups: SeatMapTicketGroup[];
    }
  | {
      type: "custom";
      grid: { rows: number; cols: number };
      seats: SeatMapSeat[];
      ticket_groups: SeatMapTicketGroup[];
    };

/* ---------------------------------------------------------------------------
 * Auth / account (api/v1)
 * ------------------------------------------------------------------------- */

/** `App\Http\Resources\Api\V1\UserResource`. */
export type UserResource = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  lang: string;
  city: string | null;
  company: string | null;
  nip: string | null;
};

export type LoginRequest = { email: string; password: string };

export type RegisterRequest = {
  email: string;
  password: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
};

export type UpdateProfileRequest = Partial<
  Pick<UserResource, "first_name" | "last_name" | "phone" | "city" | "company" | "nip">
>;

export type ChangePasswordRequest = { current_password: string; password: string };

/** `App\Enums\Statuses\TicketStatus`: int-backed enum, serializes as its integer value, not a string. */
export type TicketStatus = 0 | 1 | 2 | 10 | 99;
export const TICKET_STATUS = { CANCELLED: 0, ACTIVE: 1, DRAFT: 2, RESERVED: 10, USED: 99 } as const;

/** `App\Http\Resources\Api\V1\TicketResource` — used inside order-detail responses. */
export type TicketResource = {
  id: number;
  status: number;
  price: string;
  qr_code: string;
  ticket_group: { id: number; name: string };
  event: { id: number; name: string };
};

/** `App\Http\Resources\Api\V1\AccountTicketResource` — `GET /account/tickets` flat list. */
export type AccountTicketResource = {
  id: number;
  status: number;
  price: string;
  currency: string | null;
  qr_code: string;
  order_code: string | null;
  ticket_group: { id: number; name: string };
  event: {
    id: number;
    name: string;
    date_from: string | null;
    cover_url: string | null;
    canonical_url: string | null;
  };
};

export type OrderSummaryResource = {
  id: number;
  payment_code: string | null;
  status: PaymentStatus;
  total: number;
  currency: string | null;
  event_name: string | null;
  expiration_date: string | null;
};

export type OrderDetailResource = OrderSummaryResource & {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  tickets: TicketResource[];
};

/* ---------------------------------------------------------------------------
 * Find ticket (api/marketplace/v1)
 * ------------------------------------------------------------------------- */

/** `order_number` is `payments.id` (an autoincrement int) — not `payment_code`. */
export type TicketLookupRequest = { event_id: number; order_number: number };
export type TicketLookupResult = { phone_hint: string | null };
export type TicketVerifyRequest = TicketLookupRequest & { code: string };

/* ---------------------------------------------------------------------------
 * Content pages (api/v1)
 * ------------------------------------------------------------------------- */

export type ContentPageListResource = {
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  updated_at: string | null;
};

export type ContentPageResource = ContentPageListResource & {
  locale: string;
  /** WYSIWYG HTML content from the CMS, rendered as-is. */
  body: string | null;
};

/* ---------------------------------------------------------------------------
 * Navigation menu (api/marketplace/v1)
 * ------------------------------------------------------------------------- */

export type MenuLink =
  // `Tag.slug` is nullable here specifically — resolved through the tag's
  // (possibly absent) SEO name — unlike the non-null `Tag.slug` elsewhere.
  | { type: "tag"; tag: { id: number; name: string; slug: string | null } }
  | { type: "url"; url: string | null }
  // Static content page (`/strona/{slug}`) — dropped from the response
  // entirely (never sent as a dangling link) if the page is deleted or
  // unpublished, same handling as a dangling tag/category reference.
  | { type: "page"; page: { slug: string; title: string } }
  | null;

export type MenuItem = {
  id: number;
  title: string;
  /** `menu.clickable` is an int(0/1) column cast to bool by the model. */
  clickable: boolean;
  /** `menu.target`, e.g. `_self`/`_blank`. */
  target: string;
  link: MenuLink;
  children?: MenuItem[];
};

export type MenuResource = { code: string; title: string; items: MenuItem[] };

/* ---------------------------------------------------------------------------
 * Redirects, languages, translations, SEO (mixed surfaces)
 * ------------------------------------------------------------------------- */

export type RedirectResource = { redirect: string };

export type LanguageResource = {
  code: string;
  lang_code: string;
  country_code: string;
  /**
   * Switch target: `https://{domain}{path_prefix ?? ""}{current_path}`.
   * A language with its own domain (pl_pl -> turnup-tickets.pl) sets only
   * `domain`; one sharing another's domain under a path (ua_ua ->
   * turnup-tickets.eu/ua_ua) sets both.
   */
  domain: string | null;
  path_prefix: string | null;
  name: string;
  flag: string;
  is_default: boolean;
};

export type TranslationsResult = {
  locale: string;
  translations: Record<string, Record<string, string>>;
};

export type SeoSettingResource = {
  locale: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  tracking_head_script: string | null;
  tracking_body_script: string | null;
};
