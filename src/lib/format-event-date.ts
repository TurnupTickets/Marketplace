import { t } from "@/lib/i18n";
import { bcp47For } from "@/lib/locale";
import { getActiveLanguage } from "@/lib/locale-runtime";

/**
 * The real API dropped the friendly `starts_at`/`date_label` fields the app
 * used to get from the mock — only raw `date_from`/`date_to` (`"YYYY-MM-DD HH:MM:SS"`)
 * remain. These small formatters replace that lost convenience client-side.
 */

/**
 * Month names and order follow the visitor's language (`Intl`, from the
 * CMS language's `lang_code`): `13 listopada 2026`, `November 13, 2026`,
 * `13 листопада 2026 р.`. Local time, as before — not the event's timezone.
 */
function dateFormatter(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(bcp47For(getActiveLanguage()), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function parseEventDate(dateFrom: string): Date | null {
  const date = new Date(dateFrom.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatEventDate(dateFrom: string): string {
  const date = parseEventDate(dateFrom);
  if (!date) return dateFrom;
  return dateFormatter().format(date);
}

export function formatEventDateTime(dateFrom: string): string {
  const date = parseEventDate(dateFrom);
  if (!date) return dateFrom;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${formatEventDate(dateFrom)}, ${t("godz.")} ${hh}:${mm}`;
}
