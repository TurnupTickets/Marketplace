import { useEffect } from "react";
import type { QuoteResult } from "@/lib/api/types";
import { formatPrice } from "@/lib/format-price";
import { buildPriceLines, discountEffect, type PriceLine } from "@/lib/price-breakdown";

/**
 * Line-by-line "what makes up the final price" — every amount and the
 * "Do zapłaty" total come verbatim from the backend quote (see
 * src/lib/price-breakdown.ts); nothing is computed or rounded here.
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
  const { lines, total, inconsistent } = buildPriceLines(quote, {
    groupTickets: showTicketLines,
  });
  const effect = discountEffect(quote);

  // Diagnostics only — the displayed total is always the backend's. Keyed on
  // the numbers (the object is rebuilt every render) so it logs once per quote.
  const partsSum = inconsistent?.partsSum;
  useEffect(() => {
    if (partsSum !== undefined) {
      console.warn(`[PriceBreakdown] quote parts sum to ${partsSum} but total is ${total}`);
    }
  }, [partsSum, total]);

  return (
    <div className="space-y-3">
      <dl className="space-y-2 text-sm">
        {lines.map((line) => (
          <Line key={line.key} line={line} currency={c} />
        ))}
      </dl>
      {effect === "not-applicable" && quote.discount && (
        <p className="text-xs text-muted-foreground">
          Kod {quote.discount.code} nie dotyczy wybranych biletów.
        </p>
      )}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Do zapłaty</span>
        <span className="font-display text-xl font-bold">{formatPrice(total, c)}</span>
      </div>
    </div>
  );
}

function Line({ line, currency }: { line: PriceLine; currency: string }) {
  const accent = line.kind === "discount";
  const value =
    line.kind === "discount"
      ? `−${formatPrice(line.amount, currency)}`
      : line.kind === "service" || line.kind === "extra"
        ? `+${formatPrice(line.amount, currency)}`
        : formatPrice(line.amount, currency);
  const hint =
    line.unitPrice !== undefined ? `${formatPrice(line.unitPrice, currency)} / szt.` : line.hint;

  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="min-w-0">
        <span className={accent ? "text-primary" : undefined}>{line.label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </dt>
      <dd className={`shrink-0 font-semibold ${accent ? "text-primary" : ""}`}>{value}</dd>
    </div>
  );
}
