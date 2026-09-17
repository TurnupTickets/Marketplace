import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Minus, Plus, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/turnup/PageShell";
import { eventDetailQuery } from "@/lib/api/queries";
import { formatEventDateTime } from "@/lib/format-event-date";
import type { EventTicketGroupSummary } from "@/lib/api/types";

export const Route = createFileRoute("/wydarzenia/$tagSlug/$eventSlug")({
  loader: async ({ context, params }) => {
    try {
      const event = await context.queryClient.ensureQueryData(
        eventDetailQuery(params.tagSlug, params.eventSlug),
      );
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
  const [counts, setCounts] = useState<Record<number, number>>({});

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  // Client-side subtotal from public ticket-group prices — good enough for
  // qty-only selection. Discount codes and addon flags (Phase 4) need the
  // live quote endpoint instead, since their pricing has no static source.
  const total = useMemo(
    () => event.ticket_groups.reduce((sum, g) => sum + Number(g.price) * (counts[g.id] ?? 0), 0),
    [counts, event.ticket_groups],
  );

  const change = (id: number, delta: number, max: number) =>
    setCounts((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(max, (prev[id] ?? 0) + delta)),
    }));

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

          <ul className="divide-y divide-border">
            {event.ticket_groups.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                count={counts[group.id] ?? 0}
                onChange={(d) => change(group.id, d, group.available_count)}
              />
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {totalCount} {totalCount === 1 ? "bilet" : "biletów"}
            </span>
            <span className="font-display text-xl font-bold">{total.toFixed(2)} PLN</span>
          </div>

          {/* Checkout wiring (discount code, addon flags, live quote, and the
              order-form route itself) lands in Phases 4/6 — CTA stays inert
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
    </PageShell>
  );
}

function GroupRow({
  group,
  count,
  onChange,
}: {
  group: EventTicketGroupSummary;
  count: number;
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
      </div>

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
