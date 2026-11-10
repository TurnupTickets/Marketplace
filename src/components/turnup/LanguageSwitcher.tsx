import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { languagesQuery } from "@/lib/api/queries";
import { buildSwitchUrl, resolveLocale } from "@/lib/locale";
import { getRealUrl } from "@/lib/locale-runtime";
import type { LanguageResource } from "@/lib/api/types";

/**
 * Language switcher. Every CMS language is selectable:
 * - a language with a `domain` → that domain (+ its `path_prefix`), i.e. a
 *   separate deployment (turnup-tickets.pl / .eu / .eu/ua_ua);
 * - a language without one → this same origin with a `/<code>/` path prefix
 *   (none for the default language), see src/lib/locale.ts.
 *
 * Always a full navigation (`window.location.assign`), never a router Link:
 * query cache, SSR head and translations are not keyed by language, so a
 * fresh page load is what guarantees everything renders in the new one.
 */
function currentLocation(languages: LanguageResource[]) {
  const { origin, hostname, pathname, search } = window.location;
  return { origin, hostname, pathname, search, languages };
}

export function LanguageSwitcher({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const [open, setOpen] = useState(false);
  // { top, right } in viewport coordinates, computed from the trigger
  // button when opened — the dropdown is portaled (see below), so it can't
  // rely on the button's own `position: relative` ancestor for placement.
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { data: languages } = useQuery(languagesQuery());
  // The root route prefetches languages on the server, but the query cache
  // isn't dehydrated to the client, so the first client render has none —
  // resolve the active flag only after mount to keep hydration identical
  // (both render the neutral globe first).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = mounted && languages ? resolveLocale({ ...getRealUrl(), languages }) : null;

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Wybierz język"
        className={
          variant === "mobile"
            ? "flex shrink-0 items-center gap-1.5 md:hidden"
            : "hidden items-center gap-2 md:flex"
        }
      >
        <Globe
          className={variant === "mobile" ? "size-5" : "size-6 text-foreground"}
          strokeWidth={1.5}
        />
        <span className={variant === "mobile" ? "text-sm font-semibold" : "text-sm font-semibold"}>
          {active ? active.flag : "🌐"}
        </span>
      </button>

      {open &&
        position &&
        // Portaled out of <TopBar>'s <header> on purpose — same reason as
        // SearchModal: the header locally overrides --foreground via
        // inline style to force its own always-dark navbar look, so a
        // dropdown rendered as its DOM child would inherit that dark
        // --foreground against its own light bg-card (invisible
        // white-on-white text), regardless of being visually positioned
        // outside the header via `absolute`/`fixed`.
        createPortal(
          <>
            {/* Click-outside catcher */}
            <button
              aria-hidden
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <ul
              role="listbox"
              style={{ top: position.top, right: position.right }}
              className="fixed z-50 min-w-40 overflow-hidden rounded-2xl border border-border bg-card py-1 shadow-xl"
            >
              {(languages ?? []).map((lang) => {
                const url = buildSwitchUrl(lang, currentLocation(languages ?? []));
                const isActive = lang.code === active?.code;
                return (
                  <li key={lang.code} role="option" aria-selected={isActive}>
                    <a
                      href={url}
                      onClick={(e) => {
                        e.preventDefault();
                        setOpen(false);
                        if (!isActive) window.location.assign(url);
                      }}
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-secondary ${
                        isActive ? "font-bold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <span className="text-base leading-none">{lang.flag}</span>
                      {lang.name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </>,
          document.body,
        )}
    </>
  );
}
