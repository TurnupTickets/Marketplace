import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FeaturedGrid } from "@/components/turnup/FeaturedGrid";
import { PromoRow } from "@/components/turnup/PromoRow";
import { Reveal } from "@/components/turnup/Reveal";
import { SectionRow } from "@/components/turnup/SectionRow";
import { SiteFooter } from "@/components/turnup/SiteFooter";
import { TopBar } from "@/components/turnup/TopBar";
import { currentUserQuery, homepageQuery } from "@/lib/api/queries";

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

  // No backend endpoint returns "this customer's upcoming events" today
  // (the old mock's /me/upcoming has no real counterpart — /account/orders
  // and /account/tickets don't carry date/cover/slug, only order/ticket
  // summaries). PromoRow degrades to an empty row until that exists.
  const upcoming: never[] = [];

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <main className="mx-auto max-w-[1600px] space-y-8 pb-4">
        <FeaturedGrid events={homepage.featured} />

        <Reveal>
          <PromoRow upcoming={upcoming} isLoggedIn={Boolean(user)} />
        </Reveal>

        {homepage.tag_sliders.map((slider) => (
          <Reveal key={slider.tag.id}>
            <SectionRow slider={slider} />
          </Reveal>
        ))}
      </main>

      <SiteFooter />
    </div>
  );
}
