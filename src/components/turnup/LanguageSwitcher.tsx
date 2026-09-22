import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { languagesQuery } from "@/lib/api/queries";
import type { LanguageResource } from "@/lib/api/types";

/**
 * Domain-per-language switching (per product decision — not the language-
 * *content* switcher the plan explicitly deferred): picking a language
 * navigates the whole browser to another domain, since turnup-tickets.pl
 * (pl_pl), turnup-tickets.eu (en_en), and turnup-tickets.eu/ua_ua (ua_ua,
 * shares the .eu domain under a path prefix) are three separate frontend
 * deployments, not one app with client-side locale routing. This is a full
 * cross-origin navigation (`window.location.href =`), not a router Link —
 * client-side routing can't cross origins.
 *
 * Locally (and in any env not actually served from one of those domains)
 * no language will show as active — there's nothing on `window.location`
 * to match against. That's expected, not a bug: exercising the "current
 * language" highlight needs a real multi-domain deployment.
 */
function buildSwitchUrl(lang: LanguageResource): string | null {
  if (!lang.domain) return null;
  const { pathname, search } = window.location;
  return `https://${lang.domain}${lang.path_prefix ?? ""}${pathname}${search}`;
}

function isActiveLanguage(lang: LanguageResource): boolean {
  if (typeof window === "undefined" || !lang.domain) return false;
  if (window.location.hostname !== lang.domain) return false;
  return lang.path_prefix ? window.location.pathname.startsWith(lang.path_prefix) : true;
}

export function LanguageSwitcher({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const [open, setOpen] = useState(false);
  // { top, right } in viewport coordinates, computed from the trigger
  // button when opened — the dropdown is portaled (see below), so it can't
  // rely on the button's own `position: relative` ancestor for placement.
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { data: languages } = useQuery(languagesQuery());
  const active = languages?.find(isActiveLanguage) ?? languages?.find((l) => l.is_default);

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
                const url = buildSwitchUrl(lang);
                const isActive = lang === active;
                return (
                  <li key={lang.code} role="option" aria-selected={isActive}>
                    <a
                      href={url ?? "#"}
                      aria-disabled={!url}
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-secondary ${
                        isActive ? "font-bold text-foreground" : "text-muted-foreground"
                      } ${!url ? "pointer-events-none opacity-50" : ""}`}
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
