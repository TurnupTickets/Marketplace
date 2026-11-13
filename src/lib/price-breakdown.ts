import type { QuoteResult } from "@/lib/api/types";

/**
 * "What makes up the final price" — a pure mapping of the quote response to
 * display lines. The backend owns every amount: it rounds once, at the end,
 * and its parts sum exactly to `total`, which is also the amount stored on
 * the order and sent to the payment gateway:
 *
 *   tickets_amount + service_amount − discount_amount
 *     + additional_costs.{sms, delivery, gift, additional_cost_params} = total
 *
 * No arithmetic or rounding happens here: amounts are shown verbatim and the
 * total is always `quote.total`. `inconsistent` only reports (never fixes) a
 * response that breaks the identity, so it gets noticed in development.
 */

export type PriceLineKind = "ticket" | "tickets" | "service" | "discount" | "extra";

export type PriceLine = {
  kind: PriceLineKind;
  label: string;
  /** As returned by the backend; the discount line carries the positive discount_amount. */
  amount: number;
  hint?: string;
  /** Per-ticket base price, ticket lines only (formatted by the caller). */
  unitPrice?: number;
  /** Stable React key. */
  key: string;
};

export type PriceBreakdownResult = {
  lines: PriceLine[];
  /** `quote.total`, verbatim — what the buyer pays. */
  total: number;
  /** Set when the backend's parts don't add up to its total (diagnostics only). */
  inconsistent: { partsSum: number; total: number } | null;
};

/** Below a hundredth of a cent — float noise, not a real difference. */
const TOLERANCE = 0.0001;

export function buildPriceLines(
  quote: QuoteResult,
  { groupTickets = true }: { groupTickets?: boolean } = {},
): PriceBreakdownResult {
  // `tickets_amount` is the backend's own total of the group subtotals;
  // older API deployments don't send it yet.
  const ticketsAmount =
    quote.tickets_amount ?? quote.ticket_groups.reduce((sum, g) => sum + g.subtotal, 0);

  const lines: PriceLine[] = groupTickets
    ? quote.ticket_groups.map((group) => ({
        kind: "ticket" as const,
        key: `ticket-${group.ticket_group_id}`,
        label: `${group.name} × ${group.quantity}`,
        amount: group.subtotal,
        unitPrice: group.unit_price,
      }))
    : [{ kind: "tickets", key: "tickets", label: "Bilety", amount: ticketsAmount }];

  if (quote.service_amount > 0) {
    lines.push({
      kind: "service",
      key: "service",
      label: "Opłata serwisowa",
      amount: quote.service_amount,
    });
  }

  if (quote.discount_amount > 0) {
    lines.push({
      kind: "discount",
      key: "discount",
      label: quote.discount ? `Rabat (${quote.discount.code})` : "Rabat",
      amount: quote.discount_amount,
      ...(quote.discount?.info ? { hint: quote.discount.info } : {}),
    });
  }

  const extras: [string, string, number][] = [
    ["sms", "Bilet SMS", quote.additional_costs.sms],
    ["delivery", "Bilet kolekcjonerski z wysyłką", quote.additional_costs.delivery],
    ["gift", "Bilet prezentowy", quote.additional_costs.gift],
    ["params", "Dodatkowe opcje", quote.additional_costs.additional_cost_params],
  ];
  for (const [key, label, amount] of extras) {
    if (amount > 0) lines.push({ kind: "extra", key, label, amount });
  }

  const extrasSum = extras.reduce((sum, [, , amount]) => sum + amount, 0);
  const partsSum = ticketsAmount + quote.service_amount - quote.discount_amount + extrasSum;
  const inconsistent =
    Math.abs(partsSum - quote.total) > TOLERANCE ? { partsSum, total: quote.total } : null;

  return { lines, total: quote.total, inconsistent };
}

/**
 * A discount the API accepted (code valid for the event) can still apply
 * to none of the selected tickets — e.g. a code scoped to one ticket group
 * that isn't in the cart. The API then returns `discount` with
 * `discount_amount: 0`; the UI must not claim it was applied.
 */
export function discountEffect(quote: QuoteResult): "applied" | "not-applicable" | "none" {
  if (!quote.discount) return "none";
  return quote.discount_amount > 0 ? "applied" : "not-applicable";
}
