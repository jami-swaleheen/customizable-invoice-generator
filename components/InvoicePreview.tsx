import { formatUSD, computeTotals, type LineItem } from "@/lib/calc";
import type { CustomField, Party } from "@/lib/schema";

export type InvoicePreviewData = {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  business: Party;
  customer: Party;
  notes: string;
  line_items: LineItem[];
  custom_fields: CustomField[];
  discount_cents: number;
  tax_rate_bp: number;
};

export function InvoicePreview({ data }: { data: InvoicePreviewData }) {
  const totals = computeTotals(
    data.line_items,
    data.discount_cents,
    data.tax_rate_bp,
  );
  const visibleCustom = data.custom_fields.filter(
    (f) => f.visible && (f.label.trim() || f.value.trim()),
  );
  const taxLabel = `Tax (${(data.tax_rate_bp / 100).toFixed(2)}%)`;

  return (
    <article
      className="invoice-print bg-white text-slate-900 rounded-xl shadow-sm ring-1 ring-slate-200 p-8 sm:p-10 w-full max-w-full overflow-hidden print:shadow-none print:ring-0 print:rounded-none print:p-0 [overflow-wrap:anywhere] [word-break:break-word]"
      aria-label="Invoice preview"
    >
      <header className="flex items-start justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">
            Invoice
          </div>
          <div className="text-2xl font-semibold mt-1 tabular-nums">
            {data.invoice_number || "—"}
          </div>
          <div className="mt-2 text-sm text-slate-600 whitespace-pre-line">
            <div className="font-medium text-slate-900">
              {data.business.name || "Your business"}
            </div>
            {data.business.email && <div>{data.business.email}</div>}
            {data.business.address && (
              <div className="whitespace-pre-line">{data.business.address}</div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-slate-500">
            Amount due
          </div>
          <div className="text-3xl font-bold tabular-nums mt-1">
            {formatUSD(totals.grand_total_cents)}
          </div>
          <dl className="mt-3 text-sm text-slate-600 space-y-0.5">
            <div className="flex gap-2 justify-end">
              <dt>Issued</dt>
              <dd className="font-medium text-slate-900 tabular-nums">
                {data.issue_date || "—"}
              </dd>
            </div>
            <div className="flex gap-2 justify-end">
              <dt>Due</dt>
              <dd className="font-medium text-slate-900 tabular-nums">
                {data.due_date || "—"}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
            Bill to
          </div>
          <div className="font-medium">
            {data.customer.name || "Customer"}
          </div>
          {data.customer.email && (
            <div className="text-sm text-slate-600">{data.customer.email}</div>
          )}
          {data.customer.address && (
            <div className="text-sm text-slate-600 whitespace-pre-line">
              {data.customer.address}
            </div>
          )}
        </div>
        {visibleCustom.length > 0 && (
          <dl className="text-sm space-y-1">
            {visibleCustom.map((f) => (
              <div key={f.id} className="flex gap-2">
                <dt className="text-slate-500 min-w-24">{f.label || "—"}</dt>
                <dd className="font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="py-6">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col />
            <col className="w-16" />
            <col className="w-24" />
            <col className="w-24" />
          </colgroup>
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-300">
              <th className="text-left py-2 pr-2 font-medium">Description</th>
              <th className="text-right py-2 px-1 font-medium">Qty</th>
              <th className="text-right py-2 px-1 font-medium">Unit</th>
              <th className="text-right py-2 pl-1 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.line_items.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-6 text-center text-slate-400 italic"
                >
                  No line items yet
                </td>
              </tr>
            )}
            {data.line_items.map((it, i) => (
              <tr key={it.id} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-2 [overflow-wrap:anywhere]">
                  {it.description || "—"}
                </td>
                <td className="py-3 px-1 text-right tabular-nums">{it.qty}</td>
                <td className="py-3 px-1 text-right tabular-nums">
                  {formatUSD(it.unit_price_cents)}
                </td>
                <td className="py-3 pl-1 text-right tabular-nums font-medium">
                  {formatUSD(totals.line_totals_cents[i] ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-6 ml-auto w-full sm:max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Subtotal</dt>
            <dd className="tabular-nums">
              {formatUSD(totals.subtotal_cents)}
            </dd>
          </div>
          {totals.discount_cents > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-600">Discount</dt>
              <dd className="tabular-nums">
                − {formatUSD(totals.discount_cents)}
              </dd>
            </div>
          )}
          {totals.tax_cents > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-600">{taxLabel}</dt>
              <dd className="tabular-nums">{formatUSD(totals.tax_cents)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-2 mt-2 border-t-2 border-slate-900 text-base">
            <dt className="font-semibold">Grand total</dt>
            <dd className="font-bold tabular-nums">
              {formatUSD(totals.grand_total_cents)}
            </dd>
          </div>
        </dl>
      </section>

      {data.notes && (
        <section className="pt-6 border-t border-slate-200">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
            Notes
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-line">
            {data.notes}
          </p>
        </section>
      )}
    </article>
  );
}
