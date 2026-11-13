import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import type { LanguageResource } from "@/lib/api/types";
import { eventsSegmentFor, resolveLocale, splitLocalePrefix } from "@/lib/locale";

/**
 * The browser-facing URL — `window.location` on the client, the incoming
 * request on SSR. Locale is always read from here, never from router state:
 * the router only ever sees the prefix-stripped path (see router.tsx), and
 * the SSR server handles concurrent requests, so no per-visitor value may
 * live in module state.
 */
export const getRealUrl = createIsomorphicFn()
  .server((): { hostname: string; pathname: string } => {
    try {
      const url = getRequestUrl();
      return { hostname: url.hostname, pathname: url.pathname };
    } catch {
      return { hostname: "", pathname: "/" };
    }
  })
  .client(() => ({ hostname: window.location.hostname, pathname: window.location.pathname }));

/**
 * The CMS language list is global (same for every visitor), so one shared
 * copy is safe on the server too. Refreshed by every `getLanguages()` call —
 * the root route loads languages on each SSR request and client boot.
 */
let languagesCache: LanguageResource[] =
  typeof window === "undefined" ? [] : (window.__TURNUP_LANGUAGES__ ?? []);

export function setLanguagesCache(languages: LanguageResource[]): void {
  languagesCache = languages;
}

export function getLanguagesCache(): LanguageResource[] {
  return languagesCache;
}

/**
 * Global name of the inline bootstrap script (see RootShell). The router's
 * `rewrite.input` runs before any loader, so on the client the cache must
 * already hold the languages when the bundle starts — otherwise a localized
 * events URL (`/en_en/events/...`) would not map back to its route during
 * hydration.
 */
export const LANGUAGES_BOOTSTRAP_GLOBAL = "__TURNUP_LANGUAGES__";

declare global {
  interface Window {
    __TURNUP_LANGUAGES__?: LanguageResource[];
  }
}

/** The visitor's language (from the real URL), or null before languages load. */
export function getActiveLanguage(): LanguageResource | null {
  if (languagesCache.length === 0) return null;
  return resolveLocale({ ...getRealUrl(), languages: languagesCache });
}

/** First URL segment of the events section for the visitor's language. */
export function getActiveEventsSegment(): string {
  return eventsSegmentFor(getActiveLanguage());
}

/**
 * Path prefix the router should keep adding to every link it builds: the
 * one in the real URL — except the default language's, which is never
 * prefixed. Unknown codes are echoed back on purpose: if `output` dropped
 * them, the router would see a non-canonical URL and 307 to the unprefixed
 * page before the root route could answer 404. Dropping the default code
 * is exactly what makes `/pl_pl/x` canonicalize to `/x`.
 */
export function getActivePathPrefix(): string | null {
  const { code } = splitLocalePrefix(getRealUrl().pathname);
  if (!code) return null;
  const isDefault = languagesCache.some((l) => l.code === code && l.is_default);
  return isDefault ? null : code;
}

/**
 * `X-Localization` value for API calls: the resolved language's code when
 * it isn't the default (the backend's own default applies otherwise).
 */
export function getRequestLocaleCode(): string | null {
  const real = getRealUrl();
  if (languagesCache.length === 0) return splitLocalePrefix(real.pathname).code;
  const lang = resolveLocale({ ...real, languages: languagesCache });
  return lang && !lang.is_default ? lang.code : null;
}
