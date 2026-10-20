import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { computeTotals, formatUSD } from "@/lib/calc";
import type { InvoiceRow } from "@/lib/schema";
import DeleteInvoiceButton from "@/components/DeleteInvoiceButton";

export const instant = false;

async function listInvoices(): Promise<InvoiceRow[]> {
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as InvoiceRow[];
}

export default async function InvoicesPage() {
  const invoices = await listInvoices();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="size-8 rounded-lg bg-slate-900 text-white grid place-items-center font-bold hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              aria-label="Home"
              title="Home"
            >
              ¶
            </Link>
            <div>
              <div className="font-semibold leading-tight">All invoices</div>
              <div className="text-xs text-slate-500 leading-tight">
                {invoices.length} saved
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="px-3 py-2 text-sm rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            + New invoice
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {invoices.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoices.map((inv) => (
              <InvoiceCard key={inv.id} inv={inv} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function InvoiceCard({ inv }: { inv: InvoiceRow }) {
  const totals = computeTotals(
    inv.line_items,
    inv.discount_cents,
    inv.tax_rate_bp,
  );
  const updated = new Date(inv.updated_at);
  const dateLabel = updated.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <li className="relative group">
      <Link
        href={`/invoices/${inv.id}`}
        className="block bg-white rounded-xl ring-1 ring-slate-200 p-5 shadow-xs hover:shadow-md hover:ring-slate-300 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-slate-500">
              {inv.invoice_number}
            </div>
            <div className="font-semibold mt-1 line-clamp-1">
              {inv.customer.name || "Unnamed customer"}
            </div>
          </div>
          <div className="text-right pr-7">
            <div className="text-xs text-slate-500">Total</div>
            <div className="font-bold tabular-nums text-lg">
              {formatUSD(totals.grand_total_cents)}
            </div>
          </div>
        </div>
        <dl className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 text-xs text-slate-600 gap-y-1">
          <dt>Issued</dt>
          <dd className="text-right tabular-nums text-slate-900">
            {inv.issue_date}
          </dd>
          <dt>Due</dt>
          <dd className="text-right tabular-nums text-slate-900">
            {inv.due_date}
          </dd>
          <dt>Updated</dt>
          <dd className="text-right text-slate-900">{dateLabel}</dd>
        </dl>
      </Link>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
        <DeleteInvoiceButton
          id={inv.id}
          label={`${inv.invoice_number} · ${inv.customer.name || "Unnamed customer"}`}
        />
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 p-12 text-center">
      <div className="text-5xl mb-3">¶</div>
      <h2 className="text-lg font-semibold">No invoices yet</h2>
      <p className="text-sm text-slate-500 mt-1">
        Create your first invoice to get started.
      </p>
      <Link
        href="/"
        className="inline-block mt-4 px-4 py-2 text-sm rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-700"
      >
        + New invoice
      </Link>
    </div>
  );
}
