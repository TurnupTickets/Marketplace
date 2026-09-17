import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { parseEventPath } from "@/lib/api/endpoints";
import type { EventListResource } from "@/lib/api/types";

export function EventCard({
  event,
  className = "",
  priority = false,
  style,
  rounded = "rounded-2xl",
}: {
  event: EventListResource;
  className?: string;
  priority?: boolean;
  style?: CSSProperties;
  rounded?: string;
}) {
  const path = parseEventPath(event.canonical_url);

  const image = (
    <img
      src={event.cover_url ?? undefined}
      alt={`${event.name} — ${event.city}`}
      width={1080}
      height={1440}
      loading={priority ? "eager" : "lazy"}
      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
    />
  );

  const overlay = (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-12">
      <div className="translate-y-3 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
        <p className="truncate font-display text-sm font-bold uppercase text-white">{event.city}</p>
        {event.primary_tag && (
          <p className="truncate text-xs text-white/70">{event.primary_tag.name}</p>
        )}
      </div>
    </div>
  );

  // `canonical_url` can be null (no resolvable tag/event slug pair yet) —
  // render a non-clickable card rather than a Link to a dead route.
  if (!path) {
    return (
      <div
        className={`group relative block overflow-hidden ${rounded} bg-card ${className}`}
        style={style}
      >
        {image}
        {overlay}
      </div>
    );
  }

  return (
    <Link
      to="/wydarzenia/$tagSlug/$eventSlug"
      params={{ tagSlug: path.tagSlug, eventSlug: path.eventSlug }}
      className={`group relative block overflow-hidden ${rounded} bg-card ${className}`}
      style={style}
    >
      {image}
      {overlay}
    </Link>
  );
}
