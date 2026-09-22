import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Search, Ticket as TicketIcon } from "lucide-react";
import { z } from "zod";
import { PageShell } from "@/components/turnup/PageShell";
import { activeEventsQuery } from "@/lib/api/queries";
import { lookupTicket, verifyTicket } from "@/lib/api/endpoints";
import { ApiError, resolveMediaUrl } from "@/lib/api/client";
import { formatEventDate } from "@/lib/format-event-date";
import { TICKET_STATUS, type EventListResource, type OrderDetailResource } from "@/lib/api/types";

export const Route = createFileRoute("/znajdz-bilet")({
  head: () => ({
    meta: [
      { title: "Znajdź swój bilet — turnup" },
      {
        name: "description",
        content:
          "Nie masz biletu w skrzynce? Wybierz wydarzenie, podaj numer zamówienia i potwierdź kodem SMS, aby pobrać bilety.",
      },
      { property: "og:title", content: "Znajdź swój bilet — turnup" },
      {
        property: "og:description",
        content: "Odzyskaj bilety w dwóch krokach: numer zamówienia i kod SMS.",
      },
    ],
  }),
  component: FindTicketPage,
});

/** `App\Enums\Statuses\TicketStatus`: int-backed enum, serializes as its integer value, not a string. */
const TICKET_STATUS_LABEL: Record<number, string> = {
  [TICKET_STATUS.CANCELLED]: "Anulowany",
  [TICKET_STATUS.ACTIVE]: "Ważny",
  [TICKET_STATUS.DRAFT]: "Wersja robocza",
  [TICKET_STATUS.RESERVED]: "Zarezerwowany",
  [TICKET_STATUS.USED]: "Wykorzystany",
};

function StepsBar({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      {labels.map((label, i) => {
        const active = i + 1 <= current;
        return (
          <li key={label} className="flex min-w-0 items-center gap-2 md:flex-1">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                active
                  ? "gradient-brand border-transparent text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`truncate text-[0.65rem] font-bold uppercase tracking-widest ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** `order_number` is `payments.id` (an autoincrement int), not the opaque `payment_code`. */
const orderNumberSchema = z
  .string()
  .trim()
  .min(1, { message: "Podaj numer zamówienia" })
  .regex(/^\d+$/, { message: "Numer zamówienia to sama liczba" })
  .max(20)
  .transform((v) => Number(v));

function FindTicketPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [event, setEvent] = useState<EventListResource | null>(null);
  const [orderNumberInput, setOrderNumberInput] = useState("");
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetailResource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return setError("Wybierz wydarzenie z listy");
    const parsed = orderNumberSchema.safeParse(orderNumberInput);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Błąd danych");
    setError(null);
    setLoading(true);
    try {
      const res = await lookupTicket({ event_id: event.id, order_number: parsed.data });
      setOrderNumber(parsed.data);
      setPhoneHint(res.phone_hint ?? null);
      setStep(2);
    } catch (err) {
      // The lookup endpoint always 200s (never reveals whether the order
      // exists — see the guide) except for the 429 rate-limit, which needs
      // its own copy so the user doesn't just retry into the same wall.
      if (err instanceof ApiError && err.status === 429) {
        setError("Zbyt wiele prób. Spróbuj ponownie za kilka minut.");
      } else {
        setError("Nie znaleźliśmy zamówienia dla tego wydarzenia.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!event || orderNumber === null) return;
    const parsed = z.string().trim().min(4, { message: "Podaj kod z SMS" }).max(10).safeParse(code);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Błąd danych");
    setError(null);
    setLoading(true);
    try {
      const res = await verifyTicket({
        event_id: event.id,
        order_number: orderNumber,
        code: parsed.data,
      });
      setOrder(res);
      setStep(3);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Zbyt wiele prób. Spróbuj ponownie za kilka minut.");
      } else {
        setError("Kod jest nieprawidłowy lub wygasł.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      eyebrow="Bilety"
      title="Wyszukaj swój bilet"
      lead="Wybierz wydarzenie i podaj numer zamówienia. Potwierdzimy Twoją tożsamość kodem SMS, a następnie pokażemy wszystkie bilety przypisane do zamówienia."
    >
      <div className="mx-auto max-w-2xl space-y-6 pb-10">
        <StepsBar current={step} labels={["Zamówienie", "Kod SMS", "Twoje bilety"]} />

        {step === 1 && (
          <form
            onSubmit={submitLookup}
            className="space-y-5 rounded-3xl border border-border bg-card p-6 md:p-8"
          >
            <EventDropdown value={event} onChange={setEvent} />

            <label className="block space-y-1.5">
              <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                Numer zamówienia
              </span>
              <input
                value={orderNumberInput}
                onChange={(e) => setOrderNumberInput(e.target.value)}
                inputMode="numeric"
                placeholder="np. 4512"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </label>

            {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="gradient-brand flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold uppercase text-primary-foreground disabled:opacity-50"
            >
              {loading && <Loader2 className="size-4 animate-spin" />} Wyślij
            </button>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={submitCode}
            className="space-y-5 rounded-3xl border border-border bg-card p-6 md:p-8"
          >
            <p className="text-sm text-muted-foreground">
              Wysłaliśmy kod SMS na numer {phoneHint ?? "przypisany do zamówienia"}. Wpisz go
              poniżej, aby zobaczyć bilety.
            </p>
            <label className="block space-y-1.5">
              <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                Kod z SMS
              </span>
              <input
                value={code}
                inputMode="numeric"
                onChange={(e) => setCode(e.target.value)}
                placeholder="______"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-center font-display text-lg tracking-[0.4em] outline-none focus:border-primary"
              />
            </label>
            {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="gradient-brand flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold uppercase text-primary-foreground disabled:opacity-50"
            >
              {loading && <Loader2 className="size-4 animate-spin" />} Potwierdź kod
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              Wróć do zamówienia
            </button>
          </form>
        )}

        {step === 3 && order && (
          <div className="space-y-4 rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="gradient-brand flex size-10 items-center justify-center rounded-full">
                <Check className="size-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display text-lg font-bold uppercase">
                  Zamówienie {order.payment_code ?? `#${order.id}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.tickets.length} biletów przypisanych do zamówienia
                </p>
              </div>
            </div>

            <ul className="divide-y divide-border">
              {order.tickets.map((ticket) => (
                <li key={ticket.id} className="flex items-center gap-4 py-4">
                  <img
                    src={`data:image/png;base64,${ticket.qr_code}`}
                    alt="Kod QR biletu"
                    width={48}
                    height={48}
                    loading="lazy"
                    className="size-12 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-bold uppercase">
                      {ticket.event.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ticket.ticket_group.name} · {ticket.price} {order.currency ?? ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[0.6rem] font-bold uppercase ${
                      ticket.status === TICKET_STATUS.ACTIVE
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {TICKET_STATUS_LABEL[ticket.status] ?? "—"}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              to="/profil"
              className="gradient-brand-soft flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold uppercase text-primary-foreground"
            >
              <TicketIcon className="size-4" /> Zapisz bilety w profilu
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function EventDropdown({
  value,
  onChange,
}: {
  value: EventListResource | null;
  onChange: (event: EventListResource) => void;
}) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 200);
    return () => clearTimeout(id);
  }, [term]);

  const { data, isFetching } = useQuery({ ...activeEventsQuery(debounced), enabled: open });

  return (
    <div className="relative space-y-1.5">
      <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
        Wydarzenie
      </span>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="find-ticket-event-options"
          value={value && !open ? `${value.name} — ${value.city}` : term}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          placeholder="Szukaj aktywnego wydarzenia…"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {isFetching && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      {open && (
        <ul
          id="find-ticket-event-options"
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-border bg-card p-1 shadow-xl"
        >
          {(data ?? []).length === 0 && (
            <li className="px-4 py-3 text-sm text-muted-foreground">Brak aktywnych wydarzeń.</li>
          )}
          {(data ?? []).map((event) => (
            <li key={event.id} role="option" aria-selected={value?.id === event.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(event);
                  setTerm("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-foreground transition-colors hover:bg-secondary"
              >
                <img
                  src={resolveMediaUrl(event.cover_url)}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                  className="size-10 shrink-0 rounded-lg border border-border object-cover"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {event.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {event.city} · {formatEventDate(event.date_from)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
