import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ClientOnly, createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, Minus, MapPin, Plus, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/turnup/PageShell";
import { cartTotalQuery, eventDetailQuery } from "@/lib/api/queries";
import type { EventAddon, TicketGroup } from "@/lib/api/types";

// Deferred as a lazy import (not a static one) so leaflet's module-level side
// effects — CSS import, default-icon prototype patch — never execute during
// SSR, where `ClientOnly` alone only suppresses the render, not the import.
const LocationMap = lazy(() =>
  import("@/components/turnup/LocationMap").then((m) => ({ default: m.LocationMap })),
);

export const Route = createFileRoute("/wydarzenia/$slug")({
  loader: async ({ context, params }) => {
    try {
      const event = await context.queryClient.ensureQueryData(eventDetailQuery(params.slug));
      return { title: event.title, city: event.city, cover: event.cover_url };
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
    const title = `${loaderData.title} — ${loaderData.city ?? "bilety"} | turnup`;
    const description = `Kup bilet na ${loaderData.title} w ${loaderData.city ?? "Polsce"}. Wybierz pulę biletową i zapłać online.`;
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
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(eventDetailQuery(slug));
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [selectedAddons, setSelectedAddons] = useState<Record<number, boolean>>({});
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string | null>(null);

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  const items = useMemo(
    () =>
      event.ticket_groups
        .map((g) => ({ group_id: g.id, qty: counts[g.id] ?? 0 }))
        .filter((i) => i.qty > 0),
    [counts, event.ticket_groups],
  );
  const addonIds = useMemo(
    () =>
      Object.entries(selectedAddons)
        .filter(([, checked]) => checked)
        .map(([id]) => Number(id)),
    [selectedAddons],
  );

  // Pricing and discount validity are computed server-side — the client only
  // sends the selection and displays the returned CartTotal.
  const {
    data: cart,
    isLoading: cartLoading,
    isError: cartError,
  } = useQuery({
    ...cartTotalQuery({
      event_id: event.id,
      items,
      addon_ids: addonIds,
      discount_code: appliedDiscountCode,
    }),
    enabled: totalCount > 0,
  });

  const total = cart?.total ?? 0;
  const cartPending = totalCount > 0 && (cartLoading || cartError);
  const discountError =
    appliedDiscountCode && cart?.discount_valid === false
      ? (cart.discount_error ?? "Nieprawidłowy kod rabatowy")
      : null;

  // Clearing the cart drops the applied discount too — re-adding tickets
  // should require re-entering the code, not silently reapply the old one.
  useEffect(() => {
    if (totalCount === 0 && appliedDiscountCode !== null) setAppliedDiscountCode(null);
  }, [totalCount, appliedDiscountCode]);

  const change = (id: number, delta: number) =>
    setCounts((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));

  const toggleAddon = (id: number) => setSelectedAddons((prev) => ({ ...prev, [id]: !prev[id] }));

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
              <CalendarDays className="size-4" /> {event.date_label ?? event.starts_at}
            </p>
          </div>

          <h1 className="font-display text-2xl font-bold uppercase leading-tight md:text-4xl">
            {event.title} — {event.city}
          </h1>

          <div className="mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-3xl border border-border">
            <img
              src={event.cover_url}
              alt={`${event.title} — plakat wydarzenia`}
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
              <Info
                icon={<MapPin className="size-4" />}
                label="Miejsce"
                value={event.venue ?? "—"}
              />
              <Info
                icon={<CalendarDays className="size-4" />}
                label="Termin"
                value={event.date_label ?? event.starts_at ?? "—"}
              />
              <Info
                icon={<ShieldCheck className="size-4" />}
                label="Bilety"
                value="Elektroniczne, wysyłane na e-mail"
              />
            </dl>

            {event.venue_lat != null && event.venue_lng != null && (
              <div className="space-y-2 pt-2">
                <ClientOnly>
                  <Suspense fallback={null}>
                    <LocationMap
                      lat={event.venue_lat}
                      lng={event.venue_lng}
                      label={event.venue ?? event.title}
                    />
                  </Suspense>
                </ClientOnly>
                <p className="text-xs text-muted-foreground">
                  {event.venue_address ?? event.venue}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: ticket groups */}
        <aside className="h-fit space-y-4 rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-28">
          <div>
            <h2 className="font-display text-xl font-bold uppercase">Wybierz bilety</h2>
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              {event.title} · {event.city}
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
                      setAppliedDiscountCode(null);
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
                {appliedDiscountCode && cart?.discount_valid === true && (
                  <p className="text-xs font-semibold text-primary">
                    Zastosowano rabat — kod {appliedDiscountCode}
                  </p>
                )}
                {discountError && <p className="text-xs text-destructive">{discountError}</p>}
              </div>
            )}
          </div>

          <ul className="divide-y divide-border">
            {event.ticket_groups.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                count={counts[group.id] ?? 0}
                onChange={(d) => change(group.id, d)}
              />
            ))}
          </ul>

          {event.addons.length > 0 && (
            <ul className="space-y-3 border-t border-border pt-4">
              {event.addons.map((addon) => (
                <AddonRow
                  key={addon.id}
                  addon={addon}
                  checked={selectedAddons[addon.id] ?? false}
                  onToggle={() => toggleAddon(addon.id)}
                />
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {totalCount} {totalCount === 1 ? "bilet" : "biletów"}
            </span>
            {cartLoading ? (
              <span className="text-sm text-muted-foreground">Liczenie…</span>
            ) : cartError ? (
              <span className="text-sm text-destructive">Błąd wyliczenia kwoty</span>
            ) : (
              <span className="font-display text-xl font-bold">{total.toFixed(2)} PLN</span>
            )}
          </div>

          {totalCount === 0 || cartPending ? (
            <span
              aria-disabled
              className="gradient-brand-soft block w-full rounded-full px-6 py-4 text-center text-sm font-bold uppercase text-primary-foreground opacity-40"
            >
              Przejdź do płatności
            </span>
          ) : (
            <Link
              to="/wydarzenia/$slug/zamowienie"
              params={{ slug }}
              search={{ items, addon_ids: addonIds, discount_code: appliedDiscountCode ?? "" }}
              className="gradient-brand-soft block w-full rounded-full px-6 py-4 text-center text-sm font-bold uppercase text-primary-foreground"
            >
              Przejdź do płatności
            </Link>
          )}

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
  group: TicketGroup;
  count: number;
  onChange: (delta: number) => void;
}) {
  return (
    <li className="flex gap-4 py-5">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-display text-sm font-bold uppercase">{group.name}</p>
        {group.description && (
          <p className="text-xs leading-relaxed text-muted-foreground">{group.description}</p>
        )}
        <p className="pt-1 text-base font-bold text-primary">
          {group.price.toFixed(2)} {group.currency ?? "PLN"}
        </p>
        {group.service_fee != null && (
          <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
            Cena zawiera opłatę serwisową — {group.service_fee.toFixed(2)} PLN
          </p>
        )}
      </div>

      <div className="flex h-fit items-center gap-2">
        <button
          aria-label={`Usuń ${group.name}`}
          onClick={() => onChange(-1)}
          className="flex size-8 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-muted"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-6 text-center font-display text-sm font-bold">{count}</span>
        <button
          aria-label={`Dodaj ${group.name}`}
          onClick={() => onChange(1)}
          className="gradient-brand flex size-8 items-center justify-center rounded-full text-primary-foreground"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </li>
  );
}

function AddonRow({
  addon,
  checked,
  onToggle,
}: {
  addon: EventAddon;
  checked: boolean;
  onToggle: () => void;
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
        <span className="flex-1">
          {addon.label}
          {addon.description && (
            <span className="block text-xs text-muted-foreground">{addon.description}</span>
          )}
        </span>
        <span className="shrink-0 font-semibold text-primary">+{addon.price.toFixed(2)} PLN</span>
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
