import { ChevronRight, Handshake, MoveLeft, MoveRight } from "lucide-react";
import type { EventItem } from "@/lib/api/types";

export function PromoRow({
  upcoming,
  isLoggedIn,
  adHref = "#",
}: {
  upcoming: EventItem[];
  isLoggedIn: boolean;
  adHref?: string;
}) {
  return (
    <section className="grid gap-3 px-4 md:grid-cols-3 md:px-6">
      <div className="gradient-brand-soft flex items-center justify-between gap-3 rounded-full px-5 py-3 md:gap-4 md:px-6">
        <p className="max-w-[7.5rem] font-display text-xs font-bold uppercase leading-tight text-primary-foreground md:max-w-[9rem] md:text-sm">
          Moje nadchodzące wydarzenia
        </p>

        {isLoggedIn ? (
          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            {upcoming.slice(0, 3).map((event) => (
              <img
                key={event.id}
                src={event.cover_url}
                alt={event.title}
                width={1024}
                height={1024}
                loading="lazy"
                className="size-10 rounded-lg object-cover md:size-14"
              />
            ))}
            <button
              aria-label="Zobacz wszystkie"
              className="rounded-full p-1 text-primary-foreground transition-transform hover:translate-x-0.5"
            >
              <ChevronRight className="size-5 md:size-6" />
            </button>
          </div>
        ) : (
          <button className="shrink-0 rounded-full bg-background px-4 py-2.5 text-center text-[0.65rem] font-semibold uppercase leading-tight tracking-wide text-foreground transition-colors hover:bg-secondary md:px-6 md:py-3 md:text-xs">
            Zaloguj się
            <br />
            aby mieć dostęp
          </button>
        )}
      </div>

      <a
        href={adHref}
        className="flex items-center justify-center gap-3 rounded-full bg-brand-blue/70 px-5 py-3 md:gap-4 md:px-6"
      >
        <MoveRight className="size-5 shrink-0 text-background md:size-6" strokeWidth={3} />
        <span className="font-display text-lg font-bold tracking-tight text-background/80 md:text-xl">
          ADS
        </span>
        <MoveLeft className="size-5 shrink-0 text-background md:size-6" strokeWidth={3} />
      </a>

      <button className="gradient-brand flex items-center justify-between gap-3 rounded-full px-5 py-3 md:gap-4 md:px-6">
        <span className="font-display text-sm font-bold uppercase leading-tight text-primary-foreground">
          Sprzedawaj
          <br />
          bilety u nas!
        </span>
        <Handshake
          className="size-7 shrink-0 text-primary-foreground md:size-8"
          strokeWidth={1.5}
        />
      </button>
    </section>
  );
}
