/**
 * Money display for every price on the site. Currency always comes from the
 * API (`quote.currency` / `event.currency` / `group.currency`) — never a
 * hardcoded "PLN": events can be priced in EUR/UAH too.
 */
export function formatPrice(amount: number | string, currency: string | null | undefined): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return `${(Number.isFinite(value) ? value : 0).toFixed(2)} ${currency || "PLN"}`;
}
