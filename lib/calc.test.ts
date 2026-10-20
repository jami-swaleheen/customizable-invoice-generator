import { describe, it, expect } from "vitest";
import { computeTotals, formatUSD, dollarsToCents } from "./calc";

describe("computeTotals", () => {
  it("passes the brief's sanity check: 2 x $50 - $10 + 10% = $99.00", () => {
    const t = computeTotals(
      [{ id: "a", description: "widget", qty: 2, unit_price_cents: 5000 }],
      1000,
      1000,
    );
    expect(t.subtotal_cents).toBe(10000);
    expect(t.discount_cents).toBe(1000);
    expect(t.discounted_cents).toBe(9000);
    expect(t.tax_cents).toBe(900);
    expect(t.grand_total_cents).toBe(9900);
    expect(formatUSD(t.grand_total_cents)).toBe("$99.00");
  });

  it("rounds each line to cents before summing", () => {
    const t = computeTotals(
      [
        { id: "a", description: "x", qty: 1.5, unit_price_cents: 333 },
        { id: "b", description: "y", qty: 1.5, unit_price_cents: 333 },
      ],
      0,
      0,
    );
    expect(t.line_totals_cents).toEqual([500, 500]);
    expect(t.subtotal_cents).toBe(1000);
  });

  it("clamps discount greater than subtotal", () => {
    const t = computeTotals(
      [{ id: "a", description: "x", qty: 1, unit_price_cents: 500 }],
      99999,
      0,
    );
    expect(t.discount_cents).toBe(500);
    expect(t.grand_total_cents).toBe(0);
  });

  it("treats negatives as zero defensively", () => {
    const t = computeTotals(
      [{ id: "a", description: "x", qty: -5, unit_price_cents: -500 }],
      -100,
      -500,
    );
    expect(t.subtotal_cents).toBe(0);
    expect(t.discount_cents).toBe(0);
    expect(t.tax_cents).toBe(0);
    expect(t.grand_total_cents).toBe(0);
  });

  it("handles empty line items", () => {
    const t = computeTotals([], 0, 1000);
    expect(t.subtotal_cents).toBe(0);
    expect(t.grand_total_cents).toBe(0);
  });
});

describe("formatUSD", () => {
  it("groups thousands and pads cents", () => {
    expect(formatUSD(1234567)).toBe("$12,345.67");
    expect(formatUSD(0)).toBe("$0.00");
    expect(formatUSD(5)).toBe("$0.05");
  });
});

describe("dollarsToCents", () => {
  it("parses common formats", () => {
    expect(dollarsToCents("50")).toBe(5000);
    expect(dollarsToCents("50.00")).toBe(5000);
    expect(dollarsToCents("$1,234.56")).toBe(123456);
    expect(dollarsToCents("")).toBe(0);
    expect(dollarsToCents("abc")).toBe(0);
  });
});
