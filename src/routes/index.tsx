import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { FeaturedGrid } from "@/components/turnup/FeaturedGrid";
import { PromoRow, type UpcomingEvent } from "@/components/turnup/PromoRow";
import { Reveal } from "@/components/turnup/Reveal";
import { SectionRow } from "@/components/turnup/SectionRow";
import { SiteFooter } from "@/components/turnup/SiteFooter";
import { TopBar } from "@/components/turnup/TopBar";
import { accountTicketsQuery, currentUserQuery, homepageQuery } from "@/lib/api/queries";
import { parseEventDate } from "@/lib/format-event-date";
import type { AccountTicketResource } from "@/lib/api/types";

/** Dedupe by event (a customer can hold multiple tickets to the same
 * event), drop events without a resolvable future date, and sort by
 * `date_from` ascending — soonest event first, matching the design. */
function selectUpcomingEvents(tickets: AccountTicketResource[]): UpcomingEvent[] {
  const now = Date.now();
  const seen = new Set<number>();
  const dated: { event: UpcomingEvent; at: number }[] = [];

  for (const { event } of tickets) {
    if (!event.date_from || seen.has(event.id)) continue;
    const at = parseEventDate(event.date_from)?.getTime();
    if (at === undefined || at < now) continue;
    seen.add(event.id);
    dated.push({ event, at });
  }

  return dated.sort((a, b) => a.at - b.at).map((d) => d.event);
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Turnup — bilety na koncerty, festiwale i imprezy" },
      {
        name: "description",
        content:
          "Turnup to marketplace biletów: znajdź wydarzenie, kup bilet w kilka sekund albo sprzedawaj własne wydarzenia.",
      },
      { property: "og:title", content: "Turnup — bilety na koncerty i festiwale" },
      {
        property: "og:description",
        content: "Znajdź wydarzenie, kup bilet lub sprzedawaj bilety na swoje imprezy.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(homepageQuery());
  },
  component: Home,
});

function Home() {
  const { data: homepage } = useSuspenseQuery(homepageQuery());
  const { data: user } = useSuspenseQuery(currentUserQuery());
  // Only fetch tickets once logged in — /account/tickets 401s otherwise.
  const { data: tickets } = useQuery({ ...accountTicketsQuery(), enabled: Boolean(user) });
  const upcoming = selectUpcomingEvents(tickets?.data ?? []);
  const sliders = homepage.tag_sliders.filter((slider) => slider.events.length > 0);
  const isEmpty = homepage.featured.length === 0 && sliders.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <main className="mx-auto max-w-[1600px] space-y-8 pb-4">
        <FeaturedGrid events={homepage.featured} />

        <Reveal>
          <PromoRow upcoming={upcoming} isLoggedIn={Boolean(user)} />
        </Reveal>

        {sliders.map((slider) => (
          <Reveal key={slider.tag.id}>
            <SectionRow slider={slider} />
          </Reveal>
        ))}

        {isEmpty && (
          <section className="mx-4 flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-12 text-center md:mx-6">
            <h2 className="font-display text-xl font-bold uppercase">Wkrótce nowe wydarzenia</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Właśnie przygotowujemy kolejne wydarzenia. Zajrzyj do pełnej listy albo wróć niedługo.
            </p>
            <Link
              to="/wydarzenia"
              search={{ page: 1, q: "" }}
              className="gradient-brand inline-flex rounded-full px-6 py-3 text-sm font-bold uppercase text-primary-foreground"
            >
              Przeglądaj wydarzenia
            </Link>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
