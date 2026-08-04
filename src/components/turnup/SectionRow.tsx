import { Link } from "@tanstack/react-router";
import type { EventSection } from "@/lib/api/types";
import { EventCard } from "./EventCard";

export function SectionRow({ section }: { section: EventSection }) {
  return (
    <section className="space-y-3">
      <div className="pl-12 pr-4 md:pl-14 md:pr-6">
        <h2>
          <Link to="/wydarzenia" search={{ page: 1, q: section.label }} className="section-chip">
            {section.label}
          </Link>
        </h2>
      </div>

      <div className="no-scrollbar overflow-x-auto pb-1">
        <div className="flex w-max snap-x gap-3 px-4 md:gap-4 md:px-6">
          {section.events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              className="aspect-[4/3] w-[62vw] shrink-0 snap-start md:w-[22rem]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
