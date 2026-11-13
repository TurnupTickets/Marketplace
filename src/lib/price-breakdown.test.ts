import { describe, expect, it } from "vitest";
import type { QuoteResult } from "@/lib/api/types";
import { buildPriceLines, discountEffect } from "./price-breakdown";

/*
 * Backend contract (QuoteResource): every amount is 2dp, rounded once by the
 * backend, and tickets_amount + service_amount − discount_amount + additional
 * costs === total (=== the order's payable amount). The FE maps it to lines
 * verbatim — these tests pin that it never recomputes or rounds anything.
 */
const groupA = {
  ticket_group_id: 506,
  name: "A — Fixed fee",
  quantity: 1,
  unit_price: 100,
  subtotal: 100,
};
const groupB = {
  ticket_group_id: 507,
  name: "B — Percentage fee",
  quantity: 2,
  unit_price: 197.3,
  subtotal: 394.6,
};
const groupC = {
  ticket_group_id: 508,
  name: "C — Global fallback fee",
  quantity: 1,
  unit_price: 222,
  subtotal: 222,
};
const noExtras = { delivery: 0, gift: 0, sms: 0, additional_cost_params: 0 };

// A×1 + B×2 + C×1, DEMO10-PLN, parking — contract-shaped.
const quote: QuoteResult = {
  currency: "PLN",
  ticket_groups: [groupA, groupB, groupC],
  tickets_amount: 716.6,
  subtotal: 666.09,
  discount_amount: 74.01,
  discount: { code: "DEMO10-PLN", info: "10% off" },
  additional_costs: { ...noExtras, additional_cost_params: 100 },
  service_amount: 23.5,
  total: 766.09,
};

describe("buildPriceLines", () => {
  it("maps every component to a line, amounts verbatim", () => {
    const { lines, total, inconsistent } = buildPriceLines(quote);
    expect(lines.map((l) => [l.kind, l.amount])).toEqual([
      ["ticket", 100],
      ["ticket", 394.6],
      ["ticket", 222],
      ["service", 23.5],
      ["discount", 74.01],
      ["extra", 100],
    ]);
    expect(lines[1]).toMatchObject({ label: "B — Percentage fee × 2", unitPrice: 197.3 });
    expect(lines[4]).toMatchObject({ label: "Rabat (DEMO10-PLN)", hint: "10% off" });
    expect(total).toBe(766.09);
    expect(inconsistent).toBeNull();
  });

  it("uses the backend's tickets_amount for the collapsed line", () => {
    const { lines } = buildPriceLines({ ...quote, tickets_amount: 716.6 }, { groupTickets: false });
    expect(lines[0]).toMatchObject({ kind: "tickets", label: "Bilety", amount: 716.6 });
  });

  it("falls back to summing group subtotals when tickets_amount is absent", () => {
    const { tickets_amount: _omit, ...older } = quote;
    const { lines } = buildPriceLines(older, { groupTickets: false });
    expect(lines[0]?.amount).toBeCloseTo(716.6, 10);
  });

  it("omits zero-value lines", () => {
    const { lines } = buildPriceLines({
      ...quote,
      discount: null,
      discount_amount: 0,
      service_amount: 0,
      additional_costs: noExtras,
      total: 716.6,
    });
    expect(lines.map((l) => l.kind)).toEqual(["ticket", "ticket", "ticket"]);
  });

  it("never rounds or adjusts — the total is the backend's even if the parts disagree", () => {
    const broken = { ...quote, service_amount: 23.498, total: 766.0899999999999 };
    const { lines, total, inconsistent } = buildPriceLines(broken);
    expect(lines.find((l) => l.kind === "service")?.amount).toBe(23.498);
    expect(total).toBe(766.0899999999999);
    expect(inconsistent).toEqual({
      partsSum: expect.closeTo(766.088, 6),
      total: 766.0899999999999,
    });
  });
});

describe("discountEffect", () => {
  it("distinguishes applied, not applicable and no code", () => {
    expect(discountEffect(quote)).toBe("applied");
    expect(discountEffect({ ...quote, discount_amount: 0 })).toBe("not-applicable");
    expect(discountEffect({ ...quote, discount: null, discount_amount: 0 })).toBe("none");
  });
});
