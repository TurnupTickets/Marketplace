import { decode } from "html-entities";

/**
 * Static UI translations — the pure half (no window, no request context,
 * no API client), so it is unit-testable and shared by SSR and the browser.
 * The runtime glue (fetching, localStorage, active language) is `i18n.ts`.
 *
 * Backend contract (`GET /api/v1/translations`, TurnupCms
 * `TranslationController`): `{ locale, translations: { [group]: { [key]: text } } }`
 * for the `X-Localization` language, already merged over the default
 * language for missing keys. The CMS convention is that a KEY IS ITS
 * POLISH SOURCE TEXT (`"Zaloguj się"`), so a missing translation falls back
 * to the key itself and the page still reads correctly in Polish.
 *
 * Group names and keys come out of the CMS HTML-entity-encoded
 * (`"Strona - Zam&oacute;w"`) — only the values are decoded server-side — so
 * the index decodes both before matching against plain source strings.
 */

export type TranslationBundle = Record<string, Record<string, string>>;

/** Group for strings the storefront introduces. Looked up first. */
export const STOREFRONT_GROUP = "Strona - Storefront";

type Index = {
  byGroup: Map<string, Map<string, string>>;
  /** Every group flattened; a key in several groups keeps its best-ranked value (`rank`). */
  anyGroup: Map<string, { value: string; rank: number }>;
};

/**
 * The same Polish key often sits in several CMS groups (`Zaloguj się` in
 * `Pozostałe` and `Strona - Użytkownicy`), and the backend fills a group's
 * missing keys with the default-language text — so for a non-Polish bundle
 * one group can say `Zaloguj się` while another says `Увійти`. Prefer, in
 * order: a real translation (value differs from the key), then a
 * storefront-facing `Strona - …` group, then bundle order.
 */
function rank(group: string, key: string, value: string): number {
  return (value !== key ? 2 : 0) + (group.startsWith("Strona") ? 1 : 0);
}

export type StoredTranslations = {
  locale: string;
  savedAt: number;
  translations: TranslationBundle;
};

function buildIndex(bundle: TranslationBundle): Index {
  const byGroup = new Map<string, Map<string, string>>();
  const anyGroup = new Map<string, { value: string; rank: number }>();
  for (const [rawGroup, entries] of Object.entries(bundle)) {
    if (!entries || typeof entries !== "object") continue;
    const group = decode(rawGroup);
    const map = byGroup.get(group) ?? new Map<string, string>();
    for (const [rawKey, value] of Object.entries(entries)) {
      if (typeof value !== "string" || value === "") continue;
      const key = decode(rawKey);
      map.set(key, value);
      const score = rank(group, key, value);
      const current = anyGroup.get(key);
      if (!current || score > current.rank) anyGroup.set(key, { value, rank: score });
    }
    byGroup.set(group, map);
  }
  return { byGroup, anyGroup };
}

/**
 * `%s` / `%d` / `%1$s` positional placeholders, the same convention the CMS's
 * own `__()` uses (vsprintf), so admins edit one placeholder style.
 */
export function interpolate(text: string, params: ReadonlyArray<string | number>): string {
  if (params.length === 0) return text;
  let next = 0;
  return text.replace(/%(?:(\d+)\$)?([sd%])/g, (match, position: string | undefined, kind) => {
    if (kind === "%") return "%";
    const index = position ? Number(position) - 1 : next++;
    const value = params[index];
    return value === undefined ? match : String(value);
  });
}

export type TranslateOptions = {
  /** Look only in this group (decoded name). Default: storefront group, then any group. */
  group?: string;
  params?: ReadonlyArray<string | number>;
};

/**
 * In-memory translations for every loaded language, keyed by the CMS long
 * code (`pl_pl`). Global data (same for every visitor of a language), so
 * one shared instance is safe on the SSR server as well.
 */
export class TranslationStore {
  private entries = new Map<string, StoredTranslations & { index: Index }>();

  set(locale: string, translations: TranslationBundle, savedAt = Date.now()): void {
    this.entries.set(locale, { locale, savedAt, translations, index: buildIndex(translations) });
  }

  get(locale: string): StoredTranslations | null {
    const entry = this.entries.get(locale);
    return entry
      ? { locale: entry.locale, savedAt: entry.savedAt, translations: entry.translations }
      : null;
  }

  isFresh(locale: string, ttlMs: number, now = Date.now()): boolean {
    const entry = this.entries.get(locale);
    return !!entry && now - entry.savedAt < ttlMs;
  }

  /** `key` (Polish source) → text in `locale`; the key itself when missing. */
  translate(
    key: string,
    locale: string | null | undefined,
    options: TranslateOptions = {},
  ): string {
    const index = locale ? this.entries.get(locale)?.index : undefined;
    let text: string | undefined;
    if (index) {
      text = options.group
        ? index.byGroup.get(options.group)?.get(key)
        : (index.byGroup.get(STOREFRONT_GROUP)?.get(key) ?? index.anyGroup.get(key)?.value);
    }
    return interpolate(text ?? key, options.params ?? []);
  }
}

/* ---------------------------------------------------------------------------
 * localStorage (de)serialization — one storage key holding every language.
 * ------------------------------------------------------------------------- */

export const TRANSLATIONS_STORAGE_KEY = "turnup.translations.v1";

export function parseStoredTranslations(raw: string | null): Record<string, StoredTranslations> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, StoredTranslations> = {};
    for (const [locale, value] of Object.entries(parsed as Record<string, unknown>)) {
      const entry = value as Partial<StoredTranslations> | null;
      if (
        entry &&
        typeof entry.savedAt === "number" &&
        entry.translations &&
        typeof entry.translations === "object"
      ) {
        result[locale] = { locale, savedAt: entry.savedAt, translations: entry.translations };
      }
    }
    return result;
  } catch {
    return {};
  }
}
