import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, MapPin, Minus, Plus, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/turnup/PageShell";
import { SeatPicker } from "@/components/turnup/SeatPicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuote } from "@/hooks/use-quote";
import { eventDetailQuery, seatMapQuery } from "@/lib/api/queries";
import { formatEventDateTime } from "@/lib/format-event-date";
import type { EventTicketGroupSummary, SeatSelection, TicketSelection } from "@/lib/api/types";

export const Route = createFileRoute("/wydarzenia/$tagSlug/$eventSlug")({
  loader: async ({ context, params }) => {
    try {
      const [event] = await Promise.all([
        context.queryClient.ensureQueryData(eventDetailQuery(params.tagSlug, params.eventSlug)),
        context.queryClient.ensureQueryData(seatMapQuery(params.tagSlug, params.eventSlug)),
      ]);
      return { name: event.name, city: event.city, cover: event.cover_url };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Wydarzenie niedostępne — turnup" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.name} — ${loaderData.city} | turnup`;
    const description = `Kup bilet na ${loaderData.name} w ${loaderData.city}. Wybierz pulę biletową i zapłać online.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: EventDetail,
});

function EventDetail() {
  const { tagSlug, eventSlug } = Route.useParams();
  const { data: event } = useSuspenseQuery(eventDetailQuery(tagSlug, eventSlug));
  const { data: seatMap } = useSuspenseQuery(seatMapQuery(tagSlug, eventSlug));
  const [counts, setCounts] = useState<Record<number, number>>({});
  // `seatsByGroup` is the *confirmed* selection (feeds the cart/quote).
  // `draftSeats` is edited inside the seat-picker modal and only committed
  // to `seatsByGroup` on "Zatwierdź" — real seating plans can be large, so
  // this stays a full-screen-ish modal rather than an inline widget.
  const [seatsByGroup, setSeatsByGroup] = useState<SeatSelection>({});
  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [draftSeats, setDraftSeats] = useState<SeatSelection>({});
  const [sms, setSms] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [giftTicket, setGiftTicket] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");

  // Groups the seat map covers use seat selection instead of a qty stepper
  // — for those groups the ticket count IS the number of selected seats.
  const seatedGroupIds = useMemo(
    () => new Set(seatMap.type === "none" ? [] : seatMap.ticket_groups.map((g) => g.id)),
    [seatMap],
  );

  const openSeatModal = () => {
    setDraftSeats(seatsByGroup);
    setSeatModalOpen(true);
  };

  const toggleDraftSeat = (seatId: number, groupId: number) =>
    setDraftSeats((prev) => {
      const current = prev[groupId] ?? [];
      const next = current.includes(seatId)
        ? current.filter((id) => id !== seatId)
        : [...current, seatId];
      return { ...prev, [groupId]: next };
    });

  const confirmSeats = () => {
    setSeatsByGroup(draftSeats);
    setSeatModalOpen(false);
  };

  const totalSelectedSeats = Object.values(seatsByGroup).reduce((a, ids) => a + ids.length, 0);
  const draftSelectedSeats = Object.values(draftSeats).reduce((a, ids) => a + ids.length, 0);

  const tickets: TicketSelection = useMemo(() => {
    const map: TicketSelection = {};
    for (const [id, qty] of Object.entries(counts)) {
      if (qty > 0 && !seatedGroupIds.has(Number(id))) map[Number(id)] = qty;
    }
    for (const [id, seatIds] of Object.entries(seatsByGroup)) {
      if (seatIds.length > 0) map[Number(id)] = seatIds.length;
    }
    return map;
  }, [counts, seatsByGroup, seatedGroupIds]);

  const totalCount = Object.values(tickets).reduce((a, b) => a + b, 0);

  // No static addon/discount price list exists on the backend — the quote
  // endpoint is the only source of truth, so every selection change
  // (tickets, seats, flags, discount code) re-prices through it (debounced).
  const quoteRequest = useMemo(
    () => ({
      tickets,
      seats: seatsByGroup,
      discount: appliedDiscountCode || null,
      sms: (sms ? 1 : 0) as 0 | 1,
      delivery: (delivery ? 1 : 0) as 0 | 1,
      ticket_as_gift: (giftTicket ? 1 : 0) as 0 | 1,
    }),
    [tickets, seatsByGroup, appliedDiscountCode, sms, delivery, giftTicket],
  );

  const {
    data: quote,
    isLoading: quoteLoading,
    isFetching: quoteFetching,
    isError: quoteErrored,
    isDebouncing: quoteDebouncing,
    hasTickets: quoteHasTickets,
  } = useQuote(event.id, quoteRequest);

  // Quote is stale/untrustworthy while: no tickets selected yet, the
  // debounce window hasn't settled, or a request is in flight — in every
  // one of those states we must not show `quote`'s last-known value
  // (`keepPreviousData` would otherwise leave a zeroed cart showing the
  // previous non-zero total, and a just-applied discount code briefly
  // showing "invalid" against the pre-discount quote).
  const quotePending = quoteHasTickets && (quoteLoading || quoteFetching || quoteDebouncing);
  const total = totalCount === 0 ? 0 : (quote?.total ?? 0);
  const discountApplied =
    Boolean(appliedDiscountCode) && !quotePending && !quoteErrored && quote?.discount != null;
  const discountInvalid =
    Boolean(appliedDiscountCode) &&
    !quotePending &&
    !quoteErrored &&
    quote != null &&
    quote.discount == null;

  // Clearing the cart drops the applied discount too — re-adding tickets
  // should require re-entering the code, not silently reapply the old one.
  useEffect(() => {
    if (totalCount === 0 && appliedDiscountCode !== "") setAppliedDiscountCode("");
  }, [totalCount, appliedDiscountCode]);

  const change = (id: number, delta: number, max: number) =>
    setCounts((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(max, (prev[id] ?? 0) + delta)),
    }));

  const applyDiscount = () => {
    const code = discountCode.trim();
    if (!code) return;
    setAppliedDiscountCode(code);
  };

  return (
    <PageShell>
      <div className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:py-10">
        {/* LEFT: banner + info */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="section-chip">{event.city}</span>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" /> {formatEventDateTime(event.date_from)}
            </p>
          </div>

          <h1 className="font-display text-2xl font-bold uppercase leading-tight md:text-4xl">
            {event.name} — {event.city}
          </h1>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
            <div className="mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-3xl border border-border lg:mx-0 lg:max-w-none">
              <img
                src={event.cover_url ?? undefined}
                alt={`${event.name} — plakat wydarzenia`}
                width={1080}
                height={1440}
                className="size-full object-cover"
              />
            </div>

            <div className="space-y-4 rounded-3xl border border-border bg-card p-6 md:p-8">
              <h2 className="font-display text-xl font-bold uppercase">O wydarzeniu</h2>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                {event.description}
              </p>

              <dl className="grid gap-4 pt-2 sm:grid-cols-3">
                <Info icon={<MapPin className="size-4" />} label="Miejsce" value={event.place} />
                <Info
                  icon={<CalendarDays className="size-4" />}
                  label="Termin"
                  value={formatEventDateTime(event.date_from)}
                />
                <Info
                  icon={<ShieldCheck className="size-4" />}
                  label="Bilety"
                  value="Elektroniczne, wysyłane na e-mail"
                />
              </dl>

              {/* No venue-coordinate field exists on the real EventResource
                  (street/place are plain strings) — location map dropped. */}
            </div>
          </div>
        </div>

        {/* RIGHT: ticket groups */}
        <aside className="h-fit space-y-4 rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-28">
          <div>
            <h2 className="font-display text-xl font-bold uppercase">Wybierz bilety</h2>
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              {event.name} · {event.city}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={() => setDiscountOpen((v) => !v)}
              className="gradient-brand flex w-full items-center justify-between px-5 py-3 text-left text-sm font-bold uppercase text-primary-foreground"
            >
              Masz kod rabatowy? Kliknij
              <ChevronDown
                className={`size-4 shrink-0 transition-transform ${discountOpen ? "rotate-180" : ""}`}
              />
            </button>
            {discountOpen && (
              <div className="space-y-2 bg-secondary p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => {
                      setDiscountCode(e.target.value);
                      setAppliedDiscountCode("");
                    }}
                    placeholder="Wpisz kod rabatowy"
                    className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={applyDiscount}
                    disabled={!discountCode.trim() || totalCount === 0}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground disabled:opacity-40"
                  >
                    Zastosuj
                  </button>
                </div>
                {totalCount === 0 && (
                  <p className="text-xs text-muted-foreground">Wybierz najpierw liczbę biletów.</p>
                )}
                {discountApplied && (
                  <p className="text-xs font-semibold text-primary">
                    Zastosowano rabat — {quote?.discount?.info}
                  </p>
                )}
                {discountInvalid && (
                  <p className="text-xs text-destructive">Nieprawidłowy kod rabatowy</p>
                )}
              </div>
            )}
          </div>

          <ul className="divide-y divide-border">
            {event.ticket_groups.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                count={
                  seatedGroupIds.has(group.id)
                    ? (seatsByGroup[group.id]?.length ?? 0)
                    : (counts[group.id] ?? 0)
                }
                seated={seatedGroupIds.has(group.id)}
                onChange={(d) => change(group.id, d, group.available_count)}
              />
            ))}
          </ul>

          {seatMap.type !== "none" && (
            <button
              type="button"
              onClick={openSeatModal}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-bold uppercase text-foreground transition-colors hover:border-primary"
            >
              {totalSelectedSeats > 0
                ? `Wybrano ${totalSelectedSeats} ${totalSelectedSeats === 1 ? "miejsce" : "miejsc"} — zmień`
                : "Wybierz miejsca na planie sali"}
            </button>
          )}

          <ul className="space-y-3 border-t border-border pt-4">
            <AddonRow
              label="Chcę otrzymać również bilet SMS"
              checked={sms}
              onToggle={() => setSms((v) => !v)}
              price={quotePending ? undefined : quote?.additional_costs.sms}
            />
            <AddonRow
              label="Zamawiam kolekcjonerski bilet z wysyłką"
              checked={delivery}
              onToggle={() => setDelivery((v) => !v)}
              price={quotePending ? undefined : quote?.additional_costs.delivery}
            />
            <AddonRow
              label="Zamawiam specjalny bilet prezentowy"
              checked={giftTicket}
              onToggle={() => setGiftTicket((v) => !v)}
              price={quotePending ? undefined : quote?.additional_costs.gift}
            />
          </ul>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {totalCount} {totalCount === 1 ? "bilet" : "biletów"}
            </span>
            {quotePending ? (
              <span className="text-sm text-muted-foreground">Liczenie…</span>
            ) : (
              <span className="font-display text-xl font-bold">{total.toFixed(2)} PLN</span>
            )}
          </div>

          {/* Order-form route + navigation land in Phase 6 — CTA stays inert
              until then. */}
          <span
            aria-disabled
            className="gradient-brand-soft block w-full rounded-full px-6 py-4 text-center text-sm font-bold uppercase text-primary-foreground opacity-40"
          >
            Przejdź do płatności
          </span>

          <Link
            to="/znajdz-bilet"
            className="block text-center text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            Masz już bilet? Znajdź go
          </Link>
        </aside>
      </div>

      {seatMap.type !== "none" && (
        <Dialog open={seatModalOpen} onOpenChange={setSeatModalOpen}>
          <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Wybierz miejsca</DialogTitle>
              <DialogDescription>
                {event.name} · {event.city}
              </DialogDescription>
            </DialogHeader>

            <SeatPicker
              seatMap={seatMap}
              selectedByGroup={draftSeats}
              onToggleSeat={toggleDraftSeat}
            />

            <DialogFooter className="items-center gap-3 sm:justify-between">
              <span className="text-sm text-muted-foreground sm:mr-auto">
                {draftSelectedSeats}{" "}
                {draftSelectedSeats === 1 ? "zaznaczone miejsce" : "zaznaczonych miejsc"}
              </span>
              <button
                type="button"
                onClick={() => setSeatModalOpen(false)}
                className="rounded-full border border-border px-6 py-2.5 text-sm font-bold uppercase text-foreground transition-colors hover:border-primary"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={confirmSeats}
                className="gradient-brand rounded-full px-6 py-2.5 text-sm font-bold uppercase text-primary-foreground"
              >
                Zatwierdź
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageShell>
  );
}

function GroupRow({
  group,
  count,
  seated,
  onChange,
}: {
  group: EventTicketGroupSummary;
  count: number;
  seated: boolean;
  onChange: (delta: number) => void;
}) {
  const soldOut = group.status !== "on_sale" || group.available_count <= 0;

  return (
    <li className="flex gap-4 py-5">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-display text-sm font-bold uppercase">{group.name}</p>
        <p className="pt-1 text-base font-bold text-primary">
          {Number(group.price).toFixed(2)} {group.currency}
        </p>
        {soldOut && (
          <p className="text-[0.65rem] uppercase tracking-wide text-destructive">Wyprzedane</p>
        )}
        {seated && (
          <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
            Wybierz miejsca na planie sali poniżej
          </p>
        )}
      </div>

      {seated ? (
        <span className="flex h-fit items-center font-display text-sm font-bold">
          {count} {count === 1 ? "miejsce" : "miejsc"}
        </span>
      ) : (
        <div className="flex h-fit items-center gap-2">
          <button
            aria-label={`Usuń ${group.name}`}
            onClick={() => onChange(-1)}
            disabled={count === 0}
            className="flex size-8 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-6 text-center font-display text-sm font-bold">{count}</span>
          <button
            aria-label={`Dodaj ${group.name}`}
            onClick={() => onChange(1)}
            disabled={soldOut || count >= group.available_count}
            className="gradient-brand flex size-8 items-center justify-center rounded-full text-primary-foreground disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
      )}
    </li>
  );
}

function AddonRow({
  label,
  checked,
  onToggle,
  price,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  /** Only known once the live quote resolves with this flag set — no static price list exists. */
  price: number | undefined;
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
        />
        <span className="flex-1">{label}</span>
        {checked && price != null && price > 0 && (
          <span className="shrink-0 font-semibold text-primary">+{price.toFixed(2)} PLN</span>
        )}
      </label>
    </li>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary p-4">
      <dt className="flex items-center gap-2 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}
