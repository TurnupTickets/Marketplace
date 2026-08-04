import mundial from "@/assets/event-mundial.jpg";
import delfinalia from "@/assets/event-delfinalia.jpg";
import jmsn from "@/assets/event-jmsn.jpg";
import scrap from "@/assets/event-scrap.jpg";
import type {
  AdBanner,
  CartRequest,
  CartTotal,
  CreateOrderInput,
  CreateOrderResult,
  EventItem,
  EventSection,
} from "./types";

const make = (
  id: number,
  title: string,
  cover: string,
  city: string,
  starts: string,
  venue: string,
): EventItem => ({
  id,
  slug: `${title.toLowerCase().replace(/\s+/g, "-")}-${id}`,
  title,
  city,
  venue,
  starts_at: starts,
  price_from: 89,
  currency: "PLN",
  cover_url: cover,
});

export const mockFeatured: EventItem[] = [
  make(1, "Mundial na Scrapie 2026", mundial, "Warszawa", "2026-06-11", "Stadion Narodowy"),
  make(2, "Mundial na Scrapie 2026", mundial, "Kraków", "2026-06-18", "Tauron Arena"),
  make(3, "Mundial na Scrapie 2026", mundial, "Gdańsk", "2026-06-25", "Polsat Plus Arena"),
  make(4, "Mundial na Scrapie 2026", mundial, "Poznań", "2026-07-02", "Enea Stadion"),
  make(5, "Mundial na Scrapie 2026", mundial, "Wrocław", "2026-07-09", "Tarczyński Arena"),
  make(6, "Mundial na Scrapie 2026", mundial, "Łódź", "2026-07-16", "Atlas Arena"),
];

export const mockSections: EventSection[] = [
  {
    id: 1,
    label: "SCRAP",
    events: [
      make(11, "Scrap Session", scrap, "Wrocław", "2026-05-29", "Transformator"),
      make(12, "Delfinalia", delfinalia, "Warszawa", "2026-06-06", "Niebo Club"),
      make(13, "Scrap Session", scrap, "Łódź", "2026-06-14", "Off Piotrkowska"),
      make(14, "Delfinalia", delfinalia, "Katowice", "2026-06-21", "P23"),
    ],
  },
  {
    id: 2,
    label: "JMSN",
    events: [
      make(21, "JMSN Tour", jmsn, "Wrocław", "2026-10-14", "Transformator Club"),
      make(22, "JMSN Tour", jmsn, "Warszawa", "2026-10-15", "Niebo Club"),
      make(23, "JMSN Tour", jmsn, "Szczecin", "2026-11-01", "Zaczek"),
      make(24, "JMSN Tour", jmsn, "Kraków", "2026-11-08", "Kwadrat"),
    ],
  },
  {
    id: 3,
    label: "Festival",
    events: [
      make(31, "Scrap Fest", scrap, "Gdynia", "2026-07-18", "Open Air"),
      make(32, "Delfinalia Open", delfinalia, "Poznań", "2026-07-25", "Stary Rynek"),
      make(33, "JMSN Live", jmsn, "Lublin", "2026-08-01", "Zamek"),
      make(34, "Scrap Fest", scrap, "Toruń", "2026-08-08", "Jordanki"),
    ],
  },
  {
    id: 4,
    label: "Teatr",
    events: [
      make(41, "JMSN Tour", jmsn, "Wrocław", "2026-09-14", "Teatr Polski"),
      make(42, "JMSN Tour", jmsn, "Warszawa", "2026-09-15", "Teatr Studio"),
      make(43, "JMSN Tour", jmsn, "Kraków", "2026-09-22", "Stary Teatr"),
      make(44, "JMSN Tour", jmsn, "Gdańsk", "2026-09-29", "Teatr Wybrzeże"),
    ],
  },
  {
    id: 5,
    label: "Inne",
    events: [
      make(51, "JMSN Tour", jmsn, "Opole", "2026-12-04", "NCPP"),
      make(52, "Scrap Session", scrap, "Rzeszów", "2026-12-11", "Klub Pod Palmą"),
      make(53, "Delfinalia", delfinalia, "Białystok", "2026-12-18", "Zmiana Klimatu"),
      make(54, "JMSN Tour", jmsn, "Kielce", "2026-12-20", "Kubatura"),
    ],
  },
];

export const mockAd: AdBanner = {
  id: 1,
  image_url: "",
  target_url: "#",
  alt: "Reklama",
};

export const mockUpcoming: EventItem[] = [
  mockSections[0]!.events[1]!,
  mockFeatured[0]!,
  mockSections[1]!.events[0]!,
];

/* ---------- Extra mocks: listing, detail, static pages, orders ---------- */

const allEvents: EventItem[] = [...mockFeatured, ...mockSections.flatMap((s) => s.events)];

export const mockAllEvents: EventItem[] = allEvents;

/** Hand-authored venue coordinates per city — deliberately incomplete so some
 * mock events exercise the "no coordinates" (hidden map) path. */
const cityCoords: Record<string, { lat: number; lng: number }> = {
  Warszawa: { lat: 52.2297, lng: 21.0122 },
  Kraków: { lat: 50.0647, lng: 19.945 },
  Gdańsk: { lat: 54.352, lng: 18.6466 },
  Poznań: { lat: 52.4064, lng: 16.9252 },
  Wrocław: { lat: 51.1079, lng: 17.0385 },
  Łódź: { lat: 51.7592, lng: 19.456 },
  Katowice: { lat: 50.2649, lng: 19.0238 },
  Szczecin: { lat: 53.4285, lng: 14.5528 },
  Gdynia: { lat: 54.5189, lng: 18.5305 },
  Lublin: { lat: 51.2465, lng: 22.5684 },
  Toruń: { lat: 53.0138, lng: 18.5984 },
  Rzeszów: { lat: 50.0413, lng: 21.999 },
  Białystok: { lat: 53.1325, lng: 23.1688 },
  // Opole and Kielce intentionally omitted.
};

export const mockDiscountCodes: Record<string, { percent: number }> = {
  TURNUP10: { percent: 10 },
  LATO2026: { percent: 15 },
};

export function mockEventDetail(slug: string) {
  const base = allEvents.find((e) => e.slug === slug) ?? allEvents[0]!;
  const coords = base.city ? cityCoords[base.city] : undefined;
  return {
    ...base,
    date_label: "15.08.2026 , godz. 15.00",
    description:
      "Zapraszamy na jedno z największych wydarzeń tego lata. Na scenie zobaczysz gwiazdy sceny alternatywnej i hip-hopowej, a strefa gastro i chill będzie czynna przez cały dzień. Bramy otwieramy dwie godziny przed startem — pamiętaj o dokumencie tożsamości.",
    venue_address: base.venue && base.city ? `${base.venue}, ${base.city}` : null,
    venue_lat: coords?.lat ?? null,
    venue_lng: coords?.lng ?? null,
    ticket_groups: [
      {
        id: 1,
        name: "Trzecia partia biletów",
        description: "Fan-zona",
        price: 197.3,
        service_fee: 12.3,
        currency: "PLN",
        available: true,
      },
      {
        id: 2,
        name: "Bilet VIP",
        description:
          "Bilet VIP zawiera: osobne wejście na festiwal, osobny bar dla klientów VIP oraz wejście do strefy VIP przed sceną.",
        price: 298.62,
        service_fee: 18.62,
        currency: "PLN",
        available: true,
      },
      {
        id: 3,
        name: "Bilet dziecięcy",
        description: "Od 7 do 16 lat. Przy wejściu wymagany dokument potwierdzający wiek.",
        price: 95.99,
        service_fee: 5.99,
        currency: "PLN",
        available: true,
      },
    ],
    addons: [
      {
        id: 1,
        label: "Chcę otrzymać również bilet SMS",
        price: 2.99,
      },
      {
        id: 2,
        label: "Zamawiam kolekcjonerski bilet z wysyłką",
        price: 19.99,
        requires_shipping_address: true,
      },
      {
        id: 3,
        label: "Zamawiam specjalny bilet prezentowy",
        description: "Spraw sobie lub komuś prezent!",
        price: 34.99,
      },
    ],
  };
}

/** Mirrors the server-side cart pricing endpoint: prices, discount validity,
 * and the final total are all computed here — the client only ever displays
 * the result, never derives it from raw ticket/addon prices itself. */
export function mockCalculateCart(input: CartRequest): CartTotal {
  const eventItem = allEvents.find((e) => e.id === input.event_id);
  const event = mockEventDetail(eventItem?.slug ?? "");

  const ticketCount = input.items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = input.items.reduce((sum, item) => {
    const group = event.ticket_groups.find((g) => g.id === item.group_id);
    return sum + (group ? group.price * item.qty : 0);
  }, 0);
  const addonsTotal = event.addons
    .filter((addon) => input.addon_ids.includes(addon.id))
    .reduce((sum, addon) => sum + addon.price, 0);

  let discountValid: boolean | undefined;
  let discountError: string | null = null;
  let discountAmount = 0;
  if (input.discount_code) {
    const entry = mockDiscountCodes[input.discount_code.trim().toUpperCase()];
    if (entry) {
      discountValid = true;
      discountAmount = subtotal * (entry.percent / 100);
    } else {
      discountValid = false;
      discountError = "Nieprawidłowy kod rabatowy";
    }
  }

  return {
    ticket_count: ticketCount,
    subtotal,
    addons_total: addonsTotal,
    discount_amount: discountAmount,
    ...(discountValid !== undefined && { discount_valid: discountValid }),
    discount_error: discountError,
    total: subtotal - discountAmount + addonsTotal,
  };
}

/** No persistence — mirrors the eventual `POST /orders` Laravel response shape
 * (order number only) without storing anything server-side. */
export function mockCreateOrder(_input: CreateOrderInput): CreateOrderResult {
  return { order_number: `TU-${Date.now().toString(36).toUpperCase()}` };
}

export const mockStaticPages = [
  {
    id: 1,
    slug: "regulamin",
    title: "Regulamin",
    updated_at: "2026-01-12",
    content_html: `
      <h2>Postanowienia ogólne</h2>
      <p>Niniejszy regulamin określa zasady korzystania z serwisu turnup, w tym zasady zakupu biletów na wydarzenia prezentowane w serwisie. Korzystając z serwisu akceptujesz poniższe warunki.</p>
      <h2>Zakup biletu</h2>
      <p>Zakup biletu następuje po wyborze wydarzenia, puli biletowej oraz opłaceniu zamówienia. Bilet w formie elektronicznej wysyłany jest na adres e-mail podany w zamówieniu.</p>
      <h2>Zwroty i reklamacje</h2>
      <p>Bilety nie podlegają zwrotowi, chyba że wydarzenie zostało odwołane lub przeniesione. Reklamacje rozpatrujemy w terminie 14 dni od dnia zgłoszenia.</p>
    `,
  },
  {
    id: 2,
    slug: "polityka-prywatnosci",
    title: "Polityka prywatności",
    updated_at: "2026-01-12",
    content_html: `
      <h2>Administrator danych</h2>
      <p>Administratorem Twoich danych osobowych jest turnup. Dane przetwarzamy w celu realizacji zamówienia oraz obsługi konta użytkownika.</p>
      <h2>Pliki cookies</h2>
      <p>Serwis wykorzystuje pliki cookies w celach statystycznych oraz w celu zapewnienia prawidłowego działania koszyka i sesji użytkownika.</p>
    `,
  },
  {
    id: 3,
    slug: "kontakt",
    title: "Kontakt",
    updated_at: "2026-02-02",
    content_html: `
      <h2>Wsparcie</h2>
      <p>Masz problem z biletem? Napisz na support@turnup.pl — odpowiadamy w dni robocze od 9:00 do 17:00.</p>
      <h2>Współpraca</h2>
      <p>Organizujesz wydarzenie i chcesz sprzedawać bilety u nas? Skontaktuj się: partners@turnup.pl.</p>
    `,
  },
  {
    id: 4,
    slug: "sposoby-platnosci",
    title: "Sposoby płatności",
    updated_at: "2026-02-20",
    content_html: `
      <h2>Dostępne metody</h2>
      <p>Obsługujemy BLIK, szybkie przelewy online, karty Visa i Mastercard oraz Apple Pay i Google Pay.</p>
      <h2>Bezpieczeństwo</h2>
      <p>Wszystkie płatności realizowane są przez certyfikowanego operatora płatności. Nie przechowujemy danych Twojej karty.</p>
    `,
  },
];

export const mockUser = {
  id: 1,
  name: "Anna Kowalska",
  email: "anna.kowalska@example.com",
  avatar_url: null,
};

export const mockOrder = {
  id: 1,
  number: "TU-2026-004512",
  email: "anna.kowalska@example.com",
  phone_hint: "•••• 512",
  tickets: [
    {
      id: 1,
      code: "TU-4512-A1",
      group_name: "Bilet VIP",
      holder: "Anna Kowalska",
      event: allEvents[0]!,
      status: "valid" as const,
    },
    {
      id: 2,
      code: "TU-4512-A2",
      group_name: "Trzecia partia biletów",
      holder: "Marek Kowalski",
      event: allEvents[1]!,
      status: "valid" as const,
    },
    {
      id: 3,
      code: "TU-4512-A3",
      group_name: "Bilet dziecięcy",
      holder: "Zofia Kowalska",
      event: allEvents[2]!,
      status: "used" as const,
    },
  ],
};
