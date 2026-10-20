import type { InvoiceInput } from "./schema";

export function blankInvoice(): InvoiceInput {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const serial = Math.floor(Math.random() * 9000 + 1000);
  return {
    invoice_number: `INV-${serial}`,
    issue_date: today,
    due_date: due,
    business: { name: "", email: "", address: "" },
    customer: { name: "", email: "", address: "" },
    notes: "",
    line_items: [
      {
        id: Math.random().toString(36).slice(2, 10),
        description: "",
        qty: 1,
        unit_price_cents: 0,
      },
    ],
    custom_fields: [],
    discount_cents: 0,
    tax_rate_bp: 0,
  };
}
