import { Link } from "@tanstack/react-router";
import type { HomepageTagSlider } from "@/lib/api/types";
import { EventCard } from "./EventCard";

export function SectionRow({ slider }: { slider: HomepageTagSlider }) {
  return (
    <section className="space-y-3">
      <div className="px-4 md:px-6">
        <h2>
          <Link to="/wydarzenia" search={{ page: 1, q: slider.tag.name }} className="section-chip">
            {slider.tag.name}
          </Link>
        </h2>
      </div>

      {/* Horizontal-only scroller. `overflow-x-auto` alone computes
          overflow-y to `auto` too, turning every row into a vertical scroll
          container that latches wheel/trackpad/touch gestures meant for the
          page — `overflow-y-hidden` hands vertical scrolling straight back
          to the page. Snap lives on the scroll container itself (it was on
          the inner track, where it did nothing); scroll-padding matches the
          track's side padding so `snap-start` cards align with the gutter. */}
      <div className="no-scrollbar snap-x snap-proximity scroll-px-4 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 md:scroll-px-6">
        <div className="flex w-max gap-3 px-4 md:gap-4 md:px-6">
          {slider.events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              className="aspect-[3/4] w-[46vw] shrink-0 snap-start md:w-[18rem]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
