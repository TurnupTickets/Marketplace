import mundial from "@/assets/event-mundial.jpg";
import delfinalia from "@/assets/event-delfinalia.jpg";
import jmsn from "@/assets/event-jmsn.jpg";
import scrap from "@/assets/event-scrap.jpg";
import { ApiError } from "./client";
import { TICKET_GROUP_STATUS } from "./types";
import type {
  AccountTicketResource,
  ContentPageListResource,
  ContentPageResource,
  CreateOrderRequest,
  EventListResource,
  EventResource,
  EventTicketGroupSummary,
  HomepageResource,
  LanguageResource,
  MenuResource,
  OrderCreatedResult,
  OrderDetailResource,
  OrderStatusResult,
  OrderSummaryResource,
  Paginated,
  QuoteRequest,
  QuoteResult,
  RedirectResource,
  SeatMapResource,
  SeoSettingResource,
  Tag,
  TicketLookupRequest,
  TicketLookupResult,
  TicketVerifyRequest,
  TranslationsResult,
  UserResource,
} from "./types";

/* ---------------------------------------------------------------------------
 * Seed data — shaped to project directly into EventListResource/EventResource
 * ------------------------------------------------------------------------- */

const tags: Record<"scrap" | "jmsn" | "festival" | "teatr" | "inne", Tag> = {
  scrap: { id: 1, name: "Scrap", slug: "scrap" },
  jmsn: { id: 2, name: "JMSN", slug: "jmsn" },
  festival: { id: 3, name: "Festival", slug: "festival" },
  teatr: { id: 4, name: "Teatr", slug: "teatr" },
  inne: { id: 5, name: "Inne", slug: "inne" },
};

type EventSeed = {
  id: number;
  name: string;
  cover: string;
  city: string;
  street: string;
  place: string;
  dateFrom: string;
  dateTo: string;
  tag: Tag;
  featured: boolean;
  eventSlug: string;
  /** Only one seeded event gets a seat scheme/custom map — see `mockSeatMap`. */
  seatMapType?: "scheme" | "custom";
};

const seed = (
  id: number,
  name: string,
  cover: string,
  city: string,
  place: string,
  dateFrom: string,
  tag: Tag,
  featured = false,
  seatMapType?: "scheme" | "custom",
): EventSeed => ({
  id,
  name,
  cover,
  city,
  street: `${place}, ${city}`,
  place,
  dateFrom: `${dateFrom} 18:00:00`,
  dateTo: `${dateFrom} 23:30:00`,
  tag,
  featured,
  eventSlug: `${name.toLowerCase().replace(/\s+/g, "-")}-${id}`,
  ...(seatMapType ? { seatMapType } : {}),
});

const eventSeeds: EventSeed[] = [
  seed(
    1,
    "Mundial na Scrapie 2026",
    mundial,
    "Warszawa",
    "Stadion Narodowy",
    "2026-06-11",
    tags.scrap,
    true,
    "custom",
  ),
  seed(
    2,
    "Mundial na Scrapie 2026",
    mundial,
    "Kraków",
    "Tauron Arena",
    "2026-06-18",
    tags.scrap,
    true,
  ),
  seed(
    3,
    "Mundial na Scrapie 2026",
    mundial,
    "Gdańsk",
    "Polsat Plus Arena",
    "2026-06-25",
    tags.scrap,
    true,
  ),
  seed(
    4,
    "Mundial na Scrapie 2026",
    mundial,
    "Poznań",
    "Enea Stadion",
    "2026-07-02",
    tags.scrap,
    true,
  ),
  seed(
    5,
    "Mundial na Scrapie 2026",
    mundial,
    "Wrocław",
    "Tarczyński Arena",
    "2026-07-09",
    tags.scrap,
    true,
  ),
  seed(
    6,
    "Mundial na Scrapie 2026",
    mundial,
    "Łódź",
    "Atlas Arena",
    "2026-07-16",
    tags.scrap,
    true,
  ),
  seed(11, "Scrap Session", scrap, "Wrocław", "Transformator", "2026-05-29", tags.scrap),
  seed(
    12,
    "Delfinalia",
    delfinalia,
    "Warszawa",
    "Niebo Club",
    "2026-06-06",
    tags.jmsn,
    false,
    "scheme",
  ),
  seed(13, "Scrap Session", scrap, "Łódź", "Off Piotrkowska", "2026-06-14", tags.scrap),
  seed(14, "Delfinalia", delfinalia, "Katowice", "P23", "2026-06-21", tags.jmsn),
  seed(21, "JMSN Tour", jmsn, "Wrocław", "Transformator Club", "2026-10-14", tags.jmsn),
  seed(22, "JMSN Tour", jmsn, "Warszawa", "Niebo Club", "2026-10-15", tags.jmsn),
  seed(23, "JMSN Tour", jmsn, "Szczecin", "Zaczek", "2026-11-01", tags.jmsn),
  seed(24, "JMSN Tour", jmsn, "Kraków", "Kwadrat", "2026-11-08", tags.jmsn),
  seed(31, "Scrap Fest", scrap, "Gdynia", "Open Air", "2026-07-18", tags.festival),
  seed(32, "Delfinalia Open", delfinalia, "Poznań", "Stary Rynek", "2026-07-25", tags.festival),
  seed(33, "JMSN Live", jmsn, "Lublin", "Zamek", "2026-08-01", tags.festival),
  seed(34, "Scrap Fest", scrap, "Toruń", "Jordanki", "2026-08-08", tags.festival),
  seed(41, "JMSN Tour", jmsn, "Wrocław", "Teatr Polski", "2026-09-14", tags.teatr),
  seed(42, "JMSN Tour", jmsn, "Warszawa", "Teatr Studio", "2026-09-15", tags.teatr),
  seed(43, "JMSN Tour", jmsn, "Kraków", "Stary Teatr", "2026-09-22", tags.teatr),
  seed(44, "JMSN Tour", jmsn, "Gdańsk", "Teatr Wybrzeże", "2026-09-29", tags.teatr),
  seed(51, "JMSN Tour", jmsn, "Opole", "NCPP", "2026-12-04", tags.inne),
  seed(52, "Scrap Session", scrap, "Rzeszów", "Klub Pod Palmą", "2026-12-11", tags.inne),
  seed(53, "Delfinalia", delfinalia, "Białystok", "Zmiana Klimatu", "2026-12-18", tags.inne),
  seed(54, "JMSN Tour", jmsn, "Kielce", "Kubatura", "2026-12-20", tags.inne),
];

function canonicalUrl(s: EventSeed): string {
  return `/${s.tag.slug}/${s.eventSlug}`;
}

function toListResource(s: EventSeed): EventListResource {
  return {
    id: s.id,
    name: s.name,
    featured: s.featured,
    city: s.city,
    date_from: s.dateFrom,
    date_to: s.dateTo,
    currency: "PLN",
    canonical_url: canonicalUrl(s),
    cover_url: s.cover,
    primary_tag: s.tag,
  };
}

const mockTicketGroups: EventTicketGroupSummary[] = [
  {
    id: 1,
    name: "Trzecia partia biletów",
    price: "197.30",
    currency: "PLN",
    available_count: 340,
    status: TICKET_GROUP_STATUS.ACTIVE,
  },
  {
    id: 2,
    name: "Bilet VIP",
    price: "298.62",
    currency: "PLN",
    available_count: 40,
    status: TICKET_GROUP_STATUS.ACTIVE,
  },
  {
    id: 3,
    name: "Bilet dziecięcy",
    price: "95.99",
    currency: "PLN",
    available_count: 120,
    status: TICKET_GROUP_STATUS.ACTIVE,
  },
];

/** Hand-authored per-city coordinates — deliberately incomplete so some mock
 * events exercise the "never geocoded" (lat/lng null, hidden map) path. */
const cityCoords: Record<string, { lat: number; lng: number }> = {
  Warszawa: { lat: 52.2297, lng: 21.0122 },
  Kraków: { lat: 50.0647, lng: 19.945 },
  Gdańsk: { lat: 54.352, lng: 18.6466 },
  Poznań: { lat: 52.4064, lng: 16.9252 },
  Wrocław: { lat: 51.1079, lng: 17.0385 },
  Łódź: { lat: 51.7592, lng: 19.456 },
  // Katowice/Szczecin/Gdynia/Lublin/Toruń and further cities intentionally
  // omitted here.
};

function toDetailResource(s: EventSeed): EventResource {
  const coords = cityCoords[s.city];
  return {
    id: s.id,
    name: s.name,
    description:
      "Zapraszamy na jedno z największych wydarzeń tego lata. Na scenie zobaczysz gwiazdy sceny alternatywnej i hip-hopowej, a strefa gastro i chill będzie czynna przez cały dzień. Bramy otwieramy dwie godziny przed startem — pamiętaj o dokumencie tożsamości.",
    city: s.city,
    street: s.street,
    place: s.place,
    date_from: s.dateFrom,
    date_to: s.dateTo,
    currency: "PLN",
    canonical_url: canonicalUrl(s),
    cover_url: s.cover,
    gallery_urls: [s.cover],
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    primary_tag: s.tag,
    ticket_groups: mockTicketGroups,
  };
}

/* ---------------------------------------------------------------------------
 * Homepage / browse
 * ------------------------------------------------------------------------- */

export const mockHomepage: HomepageResource = {
  featured: eventSeeds.filter((s) => s.featured).map(toListResource),
  tag_sliders: (Object.values(tags) as Tag[])
    .map((tag) => ({
      tag,
      events: eventSeeds
        .filter((s) => s.tag.id === tag.id)
        .map(toListResource)
        .slice(0, 12),
    }))
    .filter((slider) => slider.events.length > 0),
};

function paginate<T>(items: T[], page: number, perPage: number): Paginated<T> {
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(1, page), lastPage);
  const start = (currentPage - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);
  return {
    data: pageItems,
    links: {
      first: "?page=1",
      last: `?page=${lastPage}`,
      prev: currentPage > 1 ? `?page=${currentPage - 1}` : null,
      next: currentPage < lastPage ? `?page=${currentPage + 1}` : null,
    },
    meta: {
      current_page: currentPage,
      from: total === 0 ? null : start + 1,
      last_page: lastPage,
      per_page: perPage,
      to: total === 0 ? null : Math.min(start + perPage, total),
      total,
    },
  };
}

export function mockListEvents(
  page: number,
  perPage: number,
  search: string,
): Paginated<EventListResource> {
  const q = search.trim().toLowerCase();
  const filtered = q
    ? eventSeeds.filter((s) => `${s.name} ${s.city}`.toLowerCase().includes(q))
    : eventSeeds;
  return paginate(filtered.map(toListResource), page, perPage);
}

export function mockEventDetail(tagSlug: string, eventSlug: string): EventResource {
  const match =
    eventSeeds.find((s) => s.tag.slug === tagSlug && s.eventSlug === eventSlug) ?? eventSeeds[0]!;
  return toDetailResource(match);
}

/* ---------------------------------------------------------------------------
 * Quote / checkout
 * ------------------------------------------------------------------------- */

const mockDiscountCodes: Record<string, { percent: number; info: string }> = {
  TURNUP10: { percent: 10, info: "Rabat 10% — kod powitalny" },
  LATO2026: { percent: 15, info: "Rabat 15% — promocja letnia" },
};

const ADDON_PRICES = { sms: 2.99, delivery: 19.99, gift: 34.99 };

export function mockQuote(eventId: number, input: QuoteRequest): QuoteResult {
  const groups = mockTicketGroups.map((g) => ({
    ...g,
    quantity: input.tickets[g.id] ?? 0,
  }));

  const breakdown = groups
    .filter((g) => g.quantity > 0)
    .map((g) => {
      const unitPrice = Number(g.price);
      return {
        ticket_group_id: g.id,
        name: g.name,
        quantity: g.quantity,
        unit_price: unitPrice,
        subtotal: unitPrice * g.quantity,
      };
    });

  const rawSubtotal = breakdown.reduce((sum, b) => sum + b.subtotal, 0);

  let discount: QuoteResult["discount"] = null;
  let discountAmount = 0;
  const code = input.discount?.trim().toUpperCase();
  if (code) {
    const entry = mockDiscountCodes[code];
    if (entry) {
      discount = { code, info: entry.info };
      discountAmount = Math.round(rawSubtotal * (entry.percent / 100) * 100) / 100;
    }
  }

  const additionalCosts = {
    delivery: input.delivery ? ADDON_PRICES.delivery : 0,
    gift: input.ticket_as_gift ? ADDON_PRICES.gift : 0,
    sms: input.sms ? ADDON_PRICES.sms : 0,
    additional_cost_params: 0,
  };
  const additionalCostTotal =
    additionalCosts.delivery +
    additionalCosts.gift +
    additionalCosts.sms +
    additionalCosts.additional_cost_params;

  const subtotal = rawSubtotal - discountAmount;

  return {
    currency: "PLN",
    ticket_groups: breakdown,
    subtotal,
    discount_amount: discountAmount,
    discount,
    additional_costs: additionalCosts,
    service_amount: 0,
    total: subtotal + additionalCostTotal,
  };
}

let mockOrderSequence = 1000;

export function mockCreateOrder(_eventId: number, _input: CreateOrderRequest): OrderCreatedResult {
  mockOrderSequence += 1;
  return {
    success: true,
    payment_url: `#/mock-payment-gateway?order=${mockOrderSequence}`,
    order_id: mockOrderSequence,
  };
}

export function mockOrderStatus(paymentCode: string): OrderStatusResult {
  return {
    payment_code: paymentCode,
    status: 1,
    total: 197.3,
    currency: "PLN",
    event_name: eventSeeds[0]!.name,
    expiration_date: null,
  };
}

/* ---------------------------------------------------------------------------
 * Seat map
 * ------------------------------------------------------------------------- */

function mockCustomSeatMap(): SeatMapResource {
  const seats = [];
  let seatId = 1;
  for (let row = 1; row <= 4; row += 1) {
    for (let col = 1; col <= 6; col += 1) {
      const groupId = row <= 1 ? 2 : row <= 2 ? 1 : 3;
      seats.push({
        id: seatId,
        real_id: `r${row}c${col}`,
        section: "A",
        row: String(row),
        number: String(col),
        ticket_group_id: groupId,
        status: seatId % 7 === 0 ? "disable" : "enable",
        sold: seatId % 7 === 0,
        color: groupId === 2 ? "#f59e0b" : groupId === 1 ? "#6366f1" : "#10b981",
      });
      seatId += 1;
    }
  }
  return {
    type: "custom",
    grid: { rows: 4, cols: 6 },
    seats,
    ticket_groups: [
      { id: 1, name: "Trzecia partia biletów", color: "#6366f1" },
      { id: 2, name: "Bilet VIP", color: "#f59e0b" },
      { id: 3, name: "Bilet dziecięcy", color: "#10b981" },
    ],
  };
}

/** Circle-as-`<path>` (SVG has no native circle-path shorthand) — the
 * canvas renderer (mirroring the legacy admin export convention) only
 * parses `<path d="...">` elements, same as a real Filament-exported
 * seat scheme. A `<circle>` tag here would silently parse to zero seats. */
function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;
}

function mockSchemeSeatMap(): SeatMapResource {
  const cols = 6;
  const rows = 2;
  const radius = 10;
  const spacing = 28;
  const seats = Array.from({ length: rows * cols }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return {
      id: 101 + i,
      real_id: `seat-a${i + 1}`,
      section: "A",
      row: String(row + 1),
      number: String(col + 1),
      ticket_group_id: 2,
      status: i === 5 ? "disable" : "enable",
      sold: i === 5,
      color: "#f59e0b",
      cx: 24 + col * spacing,
      cy: 24 + row * spacing,
    };
  });
  const svg = `<svg viewBox="0 0 ${24 + cols * spacing} ${24 + rows * spacing}" xmlns="http://www.w3.org/2000/svg">${seats
    .map(
      (s) => `<path id="${s.real_id}" d="${circlePath(s.cx, s.cy, radius)}" fill="${s.color}" />`,
    )
    .join("")}</svg>`;
  return {
    type: "scheme",
    svg,
    seats: seats.map(({ cx: _cx, cy: _cy, ...seat }) => seat),
    ticket_groups: [{ id: 2, name: "Bilet VIP", color: "#f59e0b" }],
  };
}

export function mockSeatMap(tagSlug: string, eventSlug: string): SeatMapResource {
  const match = eventSeeds.find((s) => s.tag.slug === tagSlug && s.eventSlug === eventSlug);
  if (match?.seatMapType === "custom") return mockCustomSeatMap();
  if (match?.seatMapType === "scheme") return mockSchemeSeatMap();
  return { type: "none" };
}

/* ---------------------------------------------------------------------------
 * Find ticket (mock pair: event_id 1, order_number 4512, code 1234)
 * ------------------------------------------------------------------------- */

const MOCK_FIND_TICKET = { eventId: 1, orderNumber: 4512, code: "1234", phoneHint: "•••• 512" };

export function mockTicketLookup(input: TicketLookupRequest): TicketLookupResult {
  const matches =
    input.event_id === MOCK_FIND_TICKET.eventId &&
    input.order_number === MOCK_FIND_TICKET.orderNumber;
  return { phone_hint: matches ? MOCK_FIND_TICKET.phoneHint : null };
}

export function mockTicketVerify(input: TicketVerifyRequest): OrderDetailResource {
  const matches =
    input.event_id === MOCK_FIND_TICKET.eventId &&
    input.order_number === MOCK_FIND_TICKET.orderNumber &&
    input.code === MOCK_FIND_TICKET.code;
  if (!matches) {
    throw new ApiError(422, "Invalid verification code", {
      error: { code: "INVALID_VERIFICATION_CODE", message: "Kod jest nieprawidłowy lub wygasł." },
    });
  }
  return mockOrderDetail("TU-2026-004512");
}

/* ---------------------------------------------------------------------------
 * Auth / account
 * ------------------------------------------------------------------------- */

export const mockUser: UserResource = {
  id: 1,
  email: "anna.kowalska@example.com",
  first_name: "Anna",
  last_name: "Kowalska",
  phone: "512345678",
  lang: "pl_pl",
  city: "Warszawa",
  company: null,
  nip: null,
};

function mockOrderDetail(code: string): OrderDetailResource {
  const event = eventSeeds[0]!;
  return {
    id: 1,
    payment_code: code,
    status: 1,
    total: 298.62,
    currency: "PLN",
    first_name: mockUser.first_name,
    last_name: mockUser.last_name,
    email: mockUser.email,
    event_name: event.name,
    expiration_date: null,
    tickets: [
      {
        id: 1,
        status: 1,
        price: "298.62",
        qr_code: "",
        ticket_group: { id: 2, name: "Bilet VIP" },
        event: { id: event.id, name: event.name },
      },
      {
        id: 2,
        status: 1,
        price: "197.30",
        qr_code: "",
        ticket_group: { id: 1, name: "Trzecia partia biletów" },
        event: { id: event.id, name: event.name },
      },
    ],
  };
}

export const mockAccountOrders: Paginated<OrderSummaryResource> = paginate<OrderSummaryResource>(
  [
    {
      id: 1,
      payment_code: "TU-2026-004512",
      status: 1,
      total: 298.62,
      currency: "PLN",
      event_name: eventSeeds[0]!.name,
      expiration_date: null,
    },
    {
      id: 2,
      payment_code: "TU-2026-004890",
      status: 0,
      total: 95.99,
      currency: "PLN",
      event_name: eventSeeds[1]!.name,
      expiration_date: "2026-06-01 12:00:00",
    },
  ],
  1,
  50,
);

export function mockAccountOrder(code: string): OrderDetailResource {
  return mockOrderDetail(code);
}

export const mockAccountTickets: Paginated<AccountTicketResource> = paginate<AccountTicketResource>(
  [
    {
      id: 1,
      status: 1,
      price: "298.62",
      currency: "PLN",
      qr_code: "",
      order_code: "TU-2026-004512",
      ticket_group: { id: 2, name: "Bilet VIP" },
      event: { id: eventSeeds[0]!.id, name: eventSeeds[0]!.name },
    },
  ],
  1,
  50,
);

/* ---------------------------------------------------------------------------
 * Content pages
 * ------------------------------------------------------------------------- */

const staticPageBodies: Record<string, string> = {
  regulamin: `
    <h2>Postanowienia ogólne</h2>
    <p>Niniejszy regulamin określa zasady korzystania z serwisu turnup, w tym zasady zakupu biletów na wydarzenia prezentowane w serwisie. Korzystając z serwisu akceptujesz poniższe warunki.</p>
    <h2>Zakup biletu</h2>
    <p>Zakup biletu następuje po wyborze wydarzenia, puli biletowej oraz opłaceniu zamówienia. Bilet w formie elektronicznej wysyłany jest na adres e-mail podany w zamówieniu.</p>
    <h2>Zwroty i reklamacje</h2>
    <p>Bilety nie podlegają zwrotowi, chyba że wydarzenie zostało odwołane lub przeniesione. Reklamacje rozpatrujemy w terminie 14 dni od dnia zgłoszenia.</p>
  `,
  "polityka-prywatnosci": `
    <h2>Administrator danych</h2>
    <p>Administratorem Twoich danych osobowych jest turnup. Dane przetwarzamy w celu realizacji zamówienia oraz obsługi konta użytkownika.</p>
    <h2>Pliki cookies</h2>
    <p>Serwis wykorzystuje pliki cookies w celach statystycznych oraz w celu zapewnienia prawidłowego działania koszyka i sesji użytkownika.</p>
  `,
  kontakt: `
    <h2>Wsparcie</h2>
    <p>Masz problem z biletem? Napisz na support@turnup.pl — odpowiadamy w dni robocze od 9:00 do 17:00.</p>
    <h2>Współpraca</h2>
    <p>Organizujesz wydarzenie i chcesz sprzedawać bilety u nas? Skontaktuj się: partners@turnup.pl.</p>
  `,
  "sposoby-platnosci": `
    <h2>Dostępne metody</h2>
    <p>Obsługujemy BLIK, szybkie przelewy online, karty Visa i Mastercard oraz Apple Pay i Google Pay.</p>
    <h2>Bezpieczeństwo</h2>
    <p>Wszystkie płatności realizowane są przez certyfikowanego operatora płatności. Nie przechowujemy danych Twojej karty.</p>
  `,
};

export const mockStaticPages: ContentPageListResource[] = [
  {
    slug: "regulamin",
    title: "Regulamin",
    meta_title: null,
    meta_description: null,
    updated_at: "2026-01-12",
  },
  {
    slug: "polityka-prywatnosci",
    title: "Polityka prywatności",
    meta_title: null,
    meta_description: null,
    updated_at: "2026-01-12",
  },
  {
    slug: "kontakt",
    title: "Kontakt",
    meta_title: null,
    meta_description: null,
    updated_at: "2026-02-02",
  },
  {
    slug: "sposoby-platnosci",
    title: "Sposoby płatności",
    meta_title: null,
    meta_description: null,
    updated_at: "2026-02-20",
  },
];

export function mockStaticPage(slug: string): ContentPageResource {
  const page = mockStaticPages.find((p) => p.slug === slug) ?? mockStaticPages[0]!;
  return { ...page, locale: "pl_pl", body: staticPageBodies[page.slug] ?? "<p>Brak treści.</p>" };
}

/* ---------------------------------------------------------------------------
 * Navigation menu
 * ------------------------------------------------------------------------- */

export function mockMenu(code: "main" | "footer"): MenuResource {
  if (code === "footer") {
    return {
      code: "footer",
      title: "Stopka",
      items: mockStaticPages.map((p) => ({
        id: `page-${p.slug}`,
        title: p.title,
        clickable: "1",
        target: "_self",
        link: { type: "url", url: `/strona/${p.slug}` },
      })),
    };
  }
  return {
    code: "main",
    title: "Menu główne",
    items: (Object.values(tags) as Tag[]).map((tag) => ({
      id: `tag-${tag.id}`,
      title: tag.name,
      clickable: "1",
      target: "_self",
      link: { type: "tag", tag },
    })),
  };
}

/* ---------------------------------------------------------------------------
 * Redirects, languages, translations, SEO
 * ------------------------------------------------------------------------- */

const mockRedirects: Record<string, string> = {
  "stare-wydarzenia/mundial-na-scrapie": "/scrap/mundial-na-scrapie-2026-1",
};

export function mockRedirect(path: string): RedirectResource | null {
  const target = mockRedirects[path.replace(/^\//, "")];
  return target ? { redirect: target } : null;
}

export const mockLanguages: LanguageResource[] = [
  {
    code: "pl",
    lang_code: "pl_pl",
    country_code: "PL",
    name: "Polski",
    flag: "🇵🇱",
    is_default: true,
  },
  {
    code: "en",
    lang_code: "en_en",
    country_code: "GB",
    name: "English",
    flag: "🇬🇧",
    is_default: false,
  },
];

export const mockTranslations: TranslationsResult = {
  locale: "pl_pl",
  translations: {
    common: { search: "Szukaj", login: "Zaloguj się", logout: "Wyloguj się" },
  },
};

export const mockSeoSettings: SeoSettingResource = {
  locale: "pl_pl",
  meta_title: "turnup — kup bilet na koncerty, festiwale i teatr",
  meta_description: "Kup bilet online na wydarzenia w całej Polsce.",
  meta_keywords: "bilety, koncerty, festiwale, teatr",
  tracking_head_script: null,
  tracking_body_script: null,
};
