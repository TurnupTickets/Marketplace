import type { LanguageResource } from "@/lib/api/types";

/**
 * Storefront language resolution — pure functions only (no window, no
 * request context), so router rewrite, root validation, the API client and
 * the language switcher all agree on one rule:
 *
 *   1. a language whose `domain` is the current host (and whose
 *      `path_prefix`, if set, starts the path) — the multi-domain deployment;
 *   2. else a language whose `code` is the first path segment
 *      (`/en_en/...`) — same-domain switching, used when no domain is set;
 *   3. else the default language.
 *
 * The default language never carries a prefix; `/<default>/...` is
 * redirected to the unprefixed URL by the root route.
 */

/** Shape of a long language code as the CMS stores it (`pl_pl`, `en_en`, `ua_ua`). */
export const LOCALE_SEGMENT = /^[a-z]{2}_[a-z]{2}$/;

const PREFIX = /^\/([a-z]{2}_[a-z]{2})(?=\/|$)/;

/** `"/en_en/wydarzenia"` → `{ code: "en_en", rest: "/wydarzenia" }`; no prefix → `code: null`. */
export function splitLocalePrefix(pathname: string): { code: string | null; rest: string } {
  const match = PREFIX.exec(pathname);
  if (!match) return { code: null, rest: pathname || "/" };
  return { code: match[1]!, rest: pathname.slice(match[0].length) || "/" };
}

/** Inverse of `splitLocalePrefix`; `null` code is a no-op. `"/"` + `en_en` → `"/en_en"`. */
export function withLocalePrefix(pathname: string, code: string | null): string {
  if (!code) return pathname;
  return `/${code}${pathname === "/" ? "" : pathname}`;
}

function matchesDomain(lang: LanguageResource, hostname: string, pathname: string): boolean {
  if (!lang.domain || lang.domain !== hostname) return false;
  if (!lang.path_prefix) return true;
  return pathname === lang.path_prefix || pathname.startsWith(`${lang.path_prefix}/`);
}

export function resolveLocale({
  hostname,
  pathname,
  languages,
}: {
  hostname: string;
  pathname: string;
  languages: LanguageResource[];
}): LanguageResource | null {
  // Longest path_prefix first, so `.eu/ua_ua` beats a bare `.eu`.
  const byDomain = languages
    .filter((lang) => matchesDomain(lang, hostname, pathname))
    .sort((a, b) => (b.path_prefix?.length ?? 0) - (a.path_prefix?.length ?? 0))[0];
  if (byDomain) return byDomain;

  const { code } = splitLocalePrefix(pathname);
  const byPrefix = code ? languages.find((lang) => lang.code === code) : undefined;
  if (byPrefix) return byPrefix;

  return languages.find((lang) => lang.is_default) ?? null;
}

/** The path without whatever language marker the current URL carries. */
export function stripLanguageMarker(pathname: string, active: LanguageResource | null): string {
  if (active?.path_prefix && pathname.startsWith(active.path_prefix)) {
    return pathname.slice(active.path_prefix.length) || "/";
  }
  return splitLocalePrefix(pathname).rest;
}

/**
 * Where picking `target` should take the visitor — always the equivalent
 * page, query string preserved. A language with a domain goes to that
 * domain (+ its `path_prefix`); one without stays on this origin and swaps
 * the path prefix (none for the default language).
 */
export function buildSwitchUrl(
  target: LanguageResource,
  current: {
    origin: string;
    hostname: string;
    pathname: string;
    search: string;
    languages: LanguageResource[];
  },
): string {
  const active = resolveLocale(current);
  const rest = stripLanguageMarker(current.pathname, active);

  if (target.domain) {
    const prefix = target.path_prefix ?? "";
    const path = prefix && rest === "/" ? prefix : `${prefix}${rest}`;
    return `https://${target.domain}${path}${current.search}`;
  }

  const path = target.is_default ? rest : withLocalePrefix(rest, target.code);
  return `${current.origin}${path}${current.search}`;
}
