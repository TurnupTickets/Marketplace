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
    <section className="grid grid-cols-3 gap-2.5 px-4 md:gap-3 md:px-6">
      {/* ZALOGUJ — 2/3 on mobile, 1/3 on desktop. Split 50/50 inside. */}
      <div className="gradient-brand-soft col-span-2 flex min-w-0 items-stretch gap-2 rounded-2xl p-2 md:order-1 md:col-span-1 md:rounded-full md:p-1.5">
        <div className="flex basis-1/2 items-center px-2 md:px-3">
          <p className="font-display text-xs font-bold uppercase leading-tight text-primary-foreground md:text-sm">
            Moje
            <br />
            nadchodzące
            <br />
            wydarzenia
          </p>
        </div>

        {isLoggedIn ? (
          <div className="flex basis-1/2 items-center justify-end gap-1 overflow-hidden pr-1 md:gap-2">
            {upcoming.slice(0, 3).map((event) => (
              <img
                key={event.id}
                src={event.cover_url}
                alt={event.title}
                width={1024}
                height={1024}
                loading="lazy"
                className="size-8 shrink-0 rounded-lg object-cover md:size-14"
              />
            ))}
            <button
              aria-label="Zobacz wszystkie"
              className="shrink-0 rounded-full p-0.5 text-primary-foreground transition-transform hover:translate-x-0.5"
            >
              <ChevronRight className="size-5 md:size-6" />
            </button>
          </div>
        ) : (
          <button className="flex basis-1/2 items-center justify-center rounded-xl bg-background px-2 py-2 text-center transition-colors hover:bg-secondary md:rounded-full md:px-4">
            <span className="font-display text-xs font-semibold uppercase leading-tight tracking-wide text-foreground">
              Zaloguj się aby mieć dostęp
            </span>
          </button>
        )}
      </div>

      {/* SPRZEDAWAJ — 1/3 on mobile and desktop */}
      <button className="gradient-brand col-span-1 flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 text-center md:order-3 md:flex-row md:justify-between md:gap-4 md:rounded-full md:px-6 md:text-left">
        <Handshake
          className="order-first size-6 shrink-0 text-primary-foreground md:order-last md:size-8"
          strokeWidth={1.5}
        />
        <span className="font-display text-xs font-bold uppercase leading-tight text-primary-foreground md:text-sm">
          Sprzedawaj
          <br />
          bilety u nas!
        </span>
      </button>

      {/* ADS — full width on mobile, 1/3 on desktop */}
      <a
        href={adHref}
        className="order-last col-span-3 flex min-w-0 items-center justify-center gap-3 rounded-full bg-brand-blue/70 px-5 py-3 md:order-2 md:col-span-1 md:gap-4 md:px-6"
      >
        <MoveRight className="size-5 shrink-0 text-background md:size-6" strokeWidth={3} />
        <span className="font-display text-lg font-bold tracking-tight text-background/80 md:text-xl">
          ADS
        </span>
        <MoveLeft className="size-5 shrink-0 text-background md:size-6" strokeWidth={3} />
      </a>
    </section>
  );
}
