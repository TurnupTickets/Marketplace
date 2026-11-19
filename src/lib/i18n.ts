import { getTranslations } from "@/lib/api/endpoints";
import type { LanguageResource } from "@/lib/api/types";
import {
  parseStoredTranslations,
  TRANSLATIONS_STORAGE_KEY,
  TranslationStore,
  type StoredTranslations,
  type TranslateOptions,
} from "@/lib/i18n-store";
import { getActiveLanguage } from "@/lib/locale-runtime";

export { STOREFRONT_GROUP } from "@/lib/i18n-store";

/**
 * Static UI translations — runtime glue around `TranslationStore`.
 *
 *   translate("Zaloguj się", "en_en")  // explicit language
 *   t("Zaloguj się")                   // the visitor's language
 *   t("Pokaż %s więcej", { params: [3] })
 *
 * Where a language's bundle lives:
 * - memory (`store`) — what `translate`/`t` read, synchronously;
 * - the SSR HTML — `RootShell` inlines the request language's bundle as
 *   `window.__TURNUP_TRANSLATIONS__`, read below at module init, so the
 *   first client render (hydration) sees exactly the text the server
 *   rendered — never a different localStorage copy;
 * - localStorage (`turnup.translations.v1`, every language in one entry) —
 *   lets client navigations and `loadTranslations(otherLang)` skip the
 *   network while the copy is fresh.
 *
 * `t()` is a plain function, not a hook: a language switch is always a full
 * page load (see LanguageSwitcher), so nothing needs to re-render on change.
 * Never call it at module scope — on the server that would freeze one
 * visitor's language into a module shared by all requests.
 */

/** Backend caches each bundle for 300 s; a shorter client TTL would only add requests. */
export const TRANSLATIONS_TTL_MS = 5 * 60 * 1000;

export const TRANSLATIONS_BOOTSTRAP_GLOBAL = "__TURNUP_TRANSLATIONS__";

declare global {
  interface Window {
    __TURNUP_TRANSLATIONS__?: StoredTranslations | null;
  }
}

const store = new TranslationStore();
const isBrowser = typeof window !== "undefined";

function readStorage(): Record<string, StoredTranslations> {
  if (!isBrowser) return {};
  try {
    return parseStoredTranslations(window.localStorage.getItem(TRANSLATIONS_STORAGE_KEY));
  } catch {
    return {};
  }
}

function writeStorage(entry: StoredTranslations): void {
  if (!isBrowser) return;
  try {
    const all = readStorage();
    all[entry.locale] = entry;
    window.localStorage.setItem(TRANSLATIONS_STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* private mode / quota — memory still has it */
  }
}

function remember(entry: StoredTranslations): void {
  store.set(entry.locale, entry.translations, entry.savedAt);
  writeStorage(entry);
}

if (isBrowser && window.__TURNUP_TRANSLATIONS__) {
  remember(window.__TURNUP_TRANSLATIONS__);
}

const inFlight = new Map<string, Promise<void>>();

function fetchInto(locale: string): Promise<void> {
  const pending = inFlight.get(locale);
  if (pending) return pending;
  const request = getTranslations(locale)
    .then((result) => {
      // Stored under the requested code: that is the code `t()` looks up.
      remember({ locale, savedAt: Date.now(), translations: result.translations ?? {} });
    })
    .finally(() => inFlight.delete(locale));
  inFlight.set(locale, request);
  return request;
}

function codeOf(lang: LanguageResource | string | null | undefined): string | null {
  if (!lang) return null;
  return typeof lang === "string" ? lang : lang.code;
}

/**
 * Makes `lang`'s bundle available to `translate`/`t`. Resolves once some
 * copy is in memory: a fresh one immediately, a stale one immediately with
 * a background refresh, nothing → waits for the API. Never rejects — on a
 * failed fetch the strings fall back to their Polish keys.
 */
export async function loadTranslations(
  lang: LanguageResource | string | null | undefined,
): Promise<void> {
  const locale = codeOf(lang);
  if (!locale) return;
  if (store.isFresh(locale, TRANSLATIONS_TTL_MS)) return;

  if (!store.get(locale)) {
    const stored = readStorage()[locale];
    if (stored) store.set(locale, stored.translations, stored.savedAt);
  }

  if (store.get(locale)) {
    if (!store.isFresh(locale, TRANSLATIONS_TTL_MS)) {
      fetchInto(locale).catch((error) => console.error("[i18n] refresh failed", locale, error));
    }
    return;
  }

  await fetchInto(locale).catch((error) => console.error("[i18n] load failed", locale, error));
}

/** Translation of `key` (its Polish source text) in `lang`; the key itself when missing. */
export function translate(
  key: string,
  lang: LanguageResource | string | null | undefined,
  options?: TranslateOptions,
): string {
  return store.translate(key, codeOf(lang), options);
}

/** `translate` in the visitor's language (resolved from the real URL). */
export function t(key: string, options?: TranslateOptions): string {
  return store.translate(key, getActiveLanguage()?.code, options);
}

/** The active language's bundle, for the SSR bootstrap script (see RootShell). */
export function getActiveTranslationsSnapshot(): StoredTranslations | null {
  const locale = getActiveLanguage()?.code;
  return locale ? store.get(locale) : null;
}
