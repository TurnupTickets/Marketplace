import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import type { EventItem } from "@/lib/api/types";

export function EventCard({
  event,
  className = "",
  priority = false,
  style,
  rounded = "rounded-2xl",
}: {
  event: EventItem;
  className?: string;
  priority?: boolean;
  style?: CSSProperties;
  rounded?: string;
}) {
  return (
    <Link
      to="/wydarzenia/$slug"
      params={{ slug: event.slug }}
      className={`group relative block overflow-hidden ${rounded} bg-card ${className}`}
      style={style}
    >
      <img
        src={event.cover_url}
        alt={`${event.title} — ${event.city ?? ""}`}
        width={1024}
        height={1024}
        loading={priority ? "eager" : "lazy"}
        className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-12">
        <div className="translate-y-3 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <p className="truncate font-display text-sm font-bold uppercase text-white">
            {event.city}
          </p>
          <p className="truncate text-xs text-white/70">{event.venue}</p>
        </div>
      </div>
    </Link>
  );
}
