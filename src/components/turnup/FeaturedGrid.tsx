import type { EventListResource } from "@/lib/api/types";
import { EventCard } from "./EventCard";

const TILE_RADIUS = "rounded-[10px]";

function FeaturedGroup({
  big,
  small1,
  small2,
  priority = false,
}: {
  big?: EventListResource | undefined;
  small1?: EventListResource | undefined;
  small2?: EventListResource | undefined;
  priority?: boolean;
}) {
  if (!big) return null;

  return (
    <div className="flex gap-3 md:gap-4">
      <EventCard
        event={big}
        priority={priority}
        rounded={TILE_RADIUS}
        className="aspect-[3/4] w-2/3"
      />
      <div className="flex w-1/3 flex-col gap-3 md:gap-4">
        {small1 && <EventCard event={small1} rounded={TILE_RADIUS} className="min-h-0 flex-1" />}
        {small2 && <EventCard event={small2} rounded={TILE_RADIUS} className="min-h-0 flex-1" />}
      </div>
    </div>
  );
}

export function FeaturedGrid({ events }: { events: EventListResource[] }) {
  const [a, b, c, d, e, f = c] = events;

  return (
    <section className="px-4 md:px-6">
      <h2 className="mb-3 text-center font-display text-sm font-bold uppercase tracking-[0.18em]">
        Wyróżnione
      </h2>

      <div className="flex flex-col gap-3 md:flex-row md:gap-4">
        <div className="md:w-1/2">
          <FeaturedGroup big={a} small1={b} small2={e} priority />
        </div>

        {c && (
          <div className="hidden md:block md:w-1/2">
            <FeaturedGroup big={c} small1={d} small2={f} />
          </div>
        )}
      </div>
    </section>
  );
}
