import { useState } from "react";
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
  const { data: languages } = useQuery(languagesQuery());
  const active = languages?.find(isActiveLanguage) ?? languages?.find((l) => l.is_default);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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

      {open && (
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
            className="absolute right-0 top-full z-50 mt-2 min-w-40 overflow-hidden rounded-2xl border border-border bg-card py-1 shadow-xl"
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
        </>
      )}
    </div>
  );
}
