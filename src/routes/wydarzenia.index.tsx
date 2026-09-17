import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { PageShell } from "@/components/turnup/PageShell";
import { parseEventPath } from "@/lib/api/endpoints";
import { eventsPageQuery } from "@/lib/api/queries";
import { formatEventDate } from "@/lib/format-event-date";
import type { EventListResource } from "@/lib/api/types";

const searchSchema = z.object({
  page: fallback(z.number().int(), 1).default(1),
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/wydarzenia/")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({ page: search["page"], q: search["q"] }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(eventsPageQuery(Math.max(1, deps.page), deps.q));
  },
  head: () => ({
    meta: [
      { title: "Wydarzenia — koncerty, festiwale i teatr | turnup" },
      {
        name: "description",
        content:
          "Pełna lista wydarzeń w turnup: koncerty, festiwale, teatr i imprezy klubowe. Filtruj, przeglądaj strony i kup bilet online.",
      },
      { property: "og:title", content: "Wydarzenia — turnup" },
      {
        property: "og:description",
        content: "Przeglądaj wszystkie wydarzenia i kup bilet w kilka sekund.",
      },
    ],
  }),
  component: EventsList,
});

function EventsList() {
  const { page, q } = Route.useSearch();
  const safePage = Math.max(1, page);
  const { data } = useSuspenseQuery(eventsPageQuery(safePage, q));
  const { current_page, last_page, total } = data.meta;

  return (
    <PageShell
      eyebrow="Wydarzenia"
      title={q ? `Wyniki: ${q}` : "Wszystkie wydarzenia"}
      lead={`Znaleziono ${total} wydarzeń. Strona ${current_page} z ${last_page}.`}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.data.map((event) => (
          <EventListCard key={event.id} event={event} />
        ))}
      </div>

      <nav className="mt-10 flex items-center justify-center gap-2">
        <PageLink page={safePage - 1} q={q} disabled={safePage <= 1} label="Poprzednia">
          <ChevronLeft className="size-4" />
        </PageLink>

        {Array.from({ length: last_page }, (_, i) => i + 1).map((p) => (
          <Link
            key={p}
            to="/wydarzenia"
            search={{ page: p, q }}
            className={`flex size-10 items-center justify-center rounded-full text-sm font-bold transition-colors ${
              p === current_page
                ? "gradient-brand text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {p}
          </Link>
        ))}

        <PageLink page={safePage + 1} q={q} disabled={safePage >= last_page} label="Następna">
          <ChevronRight className="size-4" />
        </PageLink>
      </nav>
    </PageShell>
  );
}

function EventListCard({ event }: { event: EventListResource }) {
  const path = parseEventPath(event.canonical_url);
  if (!path) return null;
  return (
    <Link
      to="/wydarzenia/$tagSlug/$eventSlug"
      params={{ tagSlug: path.tagSlug, eventSlug: path.eventSlug }}
      className="group overflow-hidden rounded-3xl border border-border bg-card transition-colors hover:border-primary"
    >
      <div className="aspect-[3/4] overflow-hidden">
        <img
          src={event.cover_url ?? undefined}
          alt={`${event.name} — ${event.city}`}
          width={1080}
          height={1440}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="space-y-2 p-4">
        <h2 className="font-display text-base font-bold uppercase leading-tight">{event.name}</h2>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" /> {event.city}
          {event.primary_tag ? ` · ${event.primary_tag.name}` : ""}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {formatEventDate(event.date_from)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function PageLink({
  page,
  q,
  disabled,
  label,
  children,
}: {
  page: number;
  q: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        className="flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground opacity-40"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      to="/wydarzenia"
      search={{ page, q }}
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary"
    >
      {children}
    </Link>
  );
}
