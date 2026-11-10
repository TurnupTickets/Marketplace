import type { QuoteResult } from "@/lib/api/types";
import { formatPrice } from "@/lib/format-price";

/**
 * Line-by-line "what makes up the final price", built only from the quote
 * response. The API's arithmetic (QuoteResource):
 *
 *   Σ ticket_groups[].subtotal   (base price × qty, no fee, no discount)
 *   + service_amount             (per-ticket service fee, summed)
 *   − discount_amount
 *   + additional_costs.{sms, delivery, gift, additional_cost_params}
 *   = total
 *
 * so the visible lines always add up to the "Do zapłaty" figure.
 */
export function PriceBreakdown({
  quote,
  showTicketLines = true,
}: {
  quote: QuoteResult;
  /** Event page already lists groups with steppers — it shows a single "Bilety" line instead. */
  showTicketLines?: boolean;
}) {
  const c = quote.currency;
  const ticketsTotal = quote.ticket_groups.reduce((sum, g) => sum + g.subtotal, 0);
  const extras: { label: string; amount: number }[] = [
    { label: "Bilet SMS", amount: quote.additional_costs.sms },
    { label: "Bilet kolekcjonerski z wysyłką", amount: quote.additional_costs.delivery },
    { label: "Bilet prezentowy", amount: quote.additional_costs.gift },
    { label: "Dodatkowe opcje", amount: quote.additional_costs.additional_cost_params },
  ].filter((e) => e.amount > 0);

  return (
    <div className="space-y-3">
      <dl className="space-y-2 text-sm">
        {showTicketLines ? (
          quote.ticket_groups.map((group) => (
            <Line
              key={group.ticket_group_id}
              label={`${group.name} × ${group.quantity}`}
              hint={`${formatPrice(group.unit_price, c)} / szt.`}
              value={formatPrice(group.subtotal, c)}
            />
          ))
        ) : (
          <Line label="Bilety" value={formatPrice(ticketsTotal, c)} />
        )}
        {quote.service_amount > 0 && (
          <Line label="Opłata serwisowa" value={`+${formatPrice(quote.service_amount, c)}`} />
        )}
        {quote.discount_amount > 0 && (
          <Line
            label={quote.discount ? `Rabat (${quote.discount.code})` : "Rabat"}
            hint={quote.discount?.info}
            value={`−${formatPrice(quote.discount_amount, c)}`}
            accent
          />
        )}
        {extras.map((e) => (
          <Line key={e.label} label={e.label} value={`+${formatPrice(e.amount, c)}`} />
        ))}
      </dl>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Do zapłaty</span>
        <span className="font-display text-xl font-bold">{formatPrice(quote.total, c)}</span>
      </div>
    </div>
  );
}

function Line({
  label,
  hint,
  value,
  accent = false,
}: {
  label: string;
  hint?: string | undefined;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="min-w-0">
        <span className={accent ? "text-primary" : undefined}>{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </dt>
      <dd className={`shrink-0 font-semibold ${accent ? "text-primary" : ""}`}>{value}</dd>
    </div>
  );
}
