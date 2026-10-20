import { notFound } from "next/navigation";
import InvoiceEditor from "@/components/InvoiceEditor";
import { loadInvoice } from "@/app/actions";

export const instant = false;

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await loadInvoice(id);
  if (!res.ok) notFound();
  const d = res.data;
  const initial = {
    invoice_number: d.invoice_number,
    issue_date: d.issue_date,
    due_date: d.due_date,
    business: d.business,
    customer: d.customer,
    notes: d.notes,
    line_items: d.line_items,
    custom_fields: d.custom_fields,
    discount_cents: d.discount_cents,
    tax_rate_bp: d.tax_rate_bp,
  };
  return <InvoiceEditor initial={initial} initialId={id} />;
}
