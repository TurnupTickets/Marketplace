import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, Search, X } from "lucide-react";
import { activeEventsQuery } from "@/lib/api/queries";

const QUICK = ["Festival", "Teatr", "Warszawa", "Kraków", "JMSN", "Scrap"];

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 200);
    return () => clearTimeout(id);
  }, [term]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const { data, isFetching } = useQuery({ ...activeEventsQuery(debounced), enabled: open });
  const results = useMemo(() => data ?? [], [data]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 md:p-10">
      <button
        aria-label="Zamknij wyszukiwarkę"
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
      />

      <div className="relative mt-4 w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl md:mt-10">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Search className="size-5 shrink-0 text-muted-foreground" strokeWidth={2.5} />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Szukaj eventu, miasta, kategorii…"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setTerm(q)}
              className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-2 pb-3">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Brak wyników dla „{debounced}”.
            </p>
          ) : (
            <ul className="space-y-1">
              {results.map((event) => (
                <li key={event.id}>
                  <Link
                    to="/wydarzenia/$slug"
                    params={{ slug: event.slug }}
                    onClick={onClose}
                    className="flex items-center gap-4 rounded-2xl px-3 py-2 transition-colors hover:bg-secondary"
                  >
                    <img
                      src={event.cover_url}
                      alt={event.title}
                      width={96}
                      height={96}
                      loading="lazy"
                      className="size-14 rounded-xl object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-sm font-bold">{event.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {event.city} · {event.venue}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-primary">
                      od {event.price_from} {event.currency}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-5 py-3 text-right">
          <Link
            to="/wydarzenia"
            search={{ page: 1, q: debounced }}
            onClick={onClose}
            className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
          >
            Zobacz wszystkie wydarzenia
          </Link>
        </div>
      </div>
    </div>
  );
}
