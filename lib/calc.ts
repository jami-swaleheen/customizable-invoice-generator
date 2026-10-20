export type LineItem = {
  id: string;
  description: string;
  qty: number;
  unit_price_cents: number;
};

export type Totals = {
  line_totals_cents: number[];
  subtotal_cents: number;
  discount_cents: number;
  discounted_cents: number;
  tax_cents: number;
  grand_total_cents: number;
};

export function computeTotals(
  items: LineItem[],
  rawDiscountCents: number,
  taxRateBp: number,
): Totals {
  const line_totals_cents = items.map((it) =>
    Math.round(Math.max(0, it.qty) * Math.max(0, it.unit_price_cents)),
  );
  const subtotal_cents = line_totals_cents.reduce((a, b) => a + b, 0);
  const discount_cents = Math.min(
    Math.max(0, Math.round(rawDiscountCents)),
    subtotal_cents,
  );
  const discounted_cents = subtotal_cents - discount_cents;
  const tax_cents = Math.round(
    (discounted_cents * Math.max(0, taxRateBp)) / 10000,
  );
  const grand_total_cents = discounted_cents + tax_cents;
  return {
    line_totals_cents,
    subtotal_cents,
    discount_cents,
    discounted_cents,
    tax_cents,
    grand_total_cents,
  };
}

export function formatUSD(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = (abs % 100).toString().padStart(2, "0");
  const grouped = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${grouped}.${remainder}`;
}

export function dollarsToCents(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100);
  const trimmed = input.trim().replace(/[$,\s]/g, "");
  if (!trimmed) return 0;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function centsToDollarsInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
