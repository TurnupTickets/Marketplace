import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FeaturedGrid } from "@/components/turnup/FeaturedGrid";
import { PromoRow } from "@/components/turnup/PromoRow";
import { Reveal } from "@/components/turnup/Reveal";
import { SectionRow } from "@/components/turnup/SectionRow";
import { SiteFooter } from "@/components/turnup/SiteFooter";
import { TopBar } from "@/components/turnup/TopBar";
import {
  currentUserQuery,
  eventSectionsQuery,
  featuredEventsQuery,
  myUpcomingQuery,
} from "@/lib/api/queries";

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
    await Promise.all([
      context.queryClient.ensureQueryData(featuredEventsQuery()),
      context.queryClient.ensureQueryData(eventSectionsQuery()),
    ]);
  },
  component: Home,
});

function Home() {
  const { data: featured } = useSuspenseQuery(featuredEventsQuery());
  const { data: sections } = useSuspenseQuery(eventSectionsQuery());
  const { data: user } = useSuspenseQuery(currentUserQuery());
  const { data: upcoming } = useSuspenseQuery(myUpcomingQuery());

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <main className="mx-auto max-w-[1600px] space-y-8 pb-4">
        <FeaturedGrid events={featured} />

        <Reveal>
          <PromoRow upcoming={upcoming} isLoggedIn={Boolean(user)} />
        </Reveal>

        {sections.map((section) => (
          <Reveal key={section.id}>
            <SectionRow section={section} />
          </Reveal>
        ))}
      </main>

      <SiteFooter />
    </div>
  );
}
