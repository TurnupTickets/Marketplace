/**
 * The real API dropped the friendly `starts_at`/`date_label` fields the app
 * used to get from the mock — only raw `date_from`/`date_to` (`"YYYY-MM-DD HH:MM:SS"`)
 * remain. These small formatters replace that lost convenience client-side.
 */

const MONTHS_PL = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
];

function parseEventDate(dateFrom: string): Date | null {
  const date = new Date(dateFrom.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatEventDate(dateFrom: string): string {
  const date = parseEventDate(dateFrom);
  if (!date) return dateFrom;
  return `${date.getDate()} ${MONTHS_PL[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatEventDateTime(dateFrom: string): string {
  const date = parseEventDate(dateFrom);
  if (!date) return dateFrom;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${formatEventDate(dateFrom)}, godz. ${hh}:${mm}`;
}
