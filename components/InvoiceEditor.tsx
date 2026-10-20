"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { saveInvoice, emailInvoice } from "@/app/actions";
import { InvoicePreview, type InvoicePreviewData } from "./InvoicePreview";
import {
  computeTotals,
  centsToDollarsInput,
  dollarsToCents,
  formatUSD,
} from "@/lib/calc";
import type { CustomField, InvoiceInput, LineItemInput } from "@/lib/schema";
import { downloadInvoicePdf, invoicePdfToBase64 } from "@/lib/pdf";
import { clearDraft, writeDraft } from "@/lib/draft";
import { blankInvoice } from "@/lib/blank-invoice";

type Props = {
  initial: InvoiceInput;
  initialId?: string;
};

type SaveStatusT =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

type EmailStatusT =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const AUTOSAVE_MS = 750;

type Validation =
  | { ok: true }
  | { ok: false; errors: string[]; fields: Set<string> };

function validateInvoice(inv: InvoiceInput): Validation {
  const errors: string[] = [];
  const fields = new Set<string>();
  if (!inv.invoice_number.trim()) {
    errors.push("Invoice number");
    fields.add("invoice_number");
  }
  if (!inv.business.name.trim()) {
    errors.push("From name");
    fields.add("business.name");
  }
  if (!inv.customer.name.trim()) {
    errors.push("Bill to name");
    fields.add("customer.name");
  }
  inv.line_items.forEach((it, i) => {
    if (!it.description.trim()) {
      errors.push(`Line ${i + 1} description`);
      fields.add(`line_items.${i}.description`);
    }
    if (it.unit_price_cents <= 0) {
      errors.push(`Line ${i + 1} unit price`);
      fields.add(`line_items.${i}.unit_price_cents`);
    }
  });
  return errors.length === 0 ? { ok: true } : { ok: false, errors, fields };
}

export default function InvoiceEditor({ initial, initialId }: Props) {
  const [invoice, setInvoice] = useState<InvoiceInput>(initial);
  const [id, setId] = useState<string | undefined>(initialId);
  const [status, setStatus] = useState<SaveStatusT>({ kind: "idle" });
  const [emailTo, setEmailTo] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailStatusT>({ kind: "idle" });
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [lastSaved, setLastSaved] = useState<{
    id: string;
    number: string;
  } | null>(null);

  const pdfRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef<string>(JSON.stringify(initial));
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totals = useMemo(
    () =>
      computeTotals(
        invoice.line_items,
        invoice.discount_cents,
        invoice.tax_rate_bp,
      ),
    [invoice.line_items, invoice.discount_cents, invoice.tax_rate_bp],
  );

  const validation = useMemo(() => validateInvoice(invoice), [invoice]);
  const [showErrors, setShowErrors] = useState(false);
  const invalidFields =
    showErrors && !validation.ok ? validation.fields : new Set<string>();

  const preview: InvoicePreviewData = invoice;

  const runSave = useCallback(
    async (nextInvoice: InvoiceInput, forId: string | undefined) => {
      setStatus({ kind: "saving" });
      const res = await saveInvoice(nextInvoice, forId);
      if (!res.ok) {
        setStatus({ kind: "error", message: res.error });
        return null;
      }
      setStatus({ kind: "saved" });
      lastSavedRef.current = JSON.stringify(nextInvoice);
      return res.data.id;
    },
    [],
  );

  useEffect(() => {
    if (!id) return;
    const serialized = JSON.stringify(invoice);
    if (serialized === lastSavedRef.current) return;
    if (!validation.ok) {
      setShowErrors(true);
      return;
    }
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      runSave(invoice, id);
    }, AUTOSAVE_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [invoice, id, runSave, validation.ok]);

  useEffect(() => {
    if (id) return;
    writeDraft(invoice);
  }, [invoice, id]);

  function patch(part: Partial<InvoiceInput>) {
    setInvoice((prev) => ({ ...prev, ...part }));
  }
  function patchLine(index: number, part: Partial<LineItemInput>) {
    setInvoice((prev) => {
      const next = [...prev.line_items];
      next[index] = { ...next[index], ...part };
      return { ...prev, line_items: next };
    });
  }
  function addLine() {
    setInvoice((prev) => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        { id: uid(), description: "", qty: 1, unit_price_cents: 0 },
      ],
    }));
  }
  function removeLine(index: number) {
    setInvoice((prev) => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index),
    }));
  }
  function patchCustom(index: number, part: Partial<CustomField>) {
    setInvoice((prev) => {
      const next = [...prev.custom_fields];
      next[index] = { ...next[index], ...part };
      return { ...prev, custom_fields: next };
    });
  }
  function addCustom() {
    setInvoice((prev) => ({
      ...prev,
      custom_fields: [
        ...prev.custom_fields,
        { id: uid(), label: "", value: "", visible: true },
      ],
    }));
  }
  function removeCustom(index: number) {
    setInvoice((prev) => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== index),
    }));
  }

  async function handleSaveNew() {
    if (!validation.ok) {
      setShowErrors(true);
      return;
    }
    const savedNumber = invoice.invoice_number;
    const nextId = await runSave(invoice, id);
    if (nextId && !id) {
      clearDraft();
      setLastSaved({ id: nextId, number: savedNumber });
      setInvoice(blankInvoice());
      setShowErrors(false);
      setEmailTo("");
      setEmailStatus({ kind: "idle" });
      setFormVersion((v) => v + 1);
      lastSavedRef.current = JSON.stringify(blankInvoice());
    }
  }

  async function handleDownloadPdf() {
    if (!validation.ok) {
      setShowErrors(true);
      return;
    }
    if (!pdfRef.current || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadInvoicePdf(
        pdfRef.current,
        `invoice-${invoice.invoice_number || "draft"}.pdf`,
      );
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleSendEmail() {
    if (!validation.ok) {
      setShowErrors(true);
      setEmailStatus({
        kind: "error",
        message: "Fix the required fields first.",
      });
      return;
    }
    if (!id) {
      setEmailStatus({ kind: "error", message: "Save the invoice first." });
      return;
    }
    if (!emailTo) {
      setEmailStatus({ kind: "error", message: "Enter a recipient address." });
      return;
    }
    setEmailStatus({ kind: "sending" });
    try {
      const pdfBase64 = pdfRef.current
        ? await invoicePdfToBase64(pdfRef.current)
        : undefined;
      const res = await emailInvoice(id, emailTo, pdfBase64);
      if (!res.ok) {
        setEmailStatus({ kind: "error", message: res.error });
        return;
      }
      setEmailStatus({ kind: "sent" });
    } catch (e) {
      setEmailStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Could not send",
      });
    }
  }

  const subtotalExceedsDiscountWarning =
    invoice.discount_cents > totals.subtotal_cents && totals.subtotal_cents > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 print:bg-white print:min-h-0">
      <div className="print:hidden">
        <header className="no-print sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/invoices"
                className="size-8 rounded-lg bg-slate-900 text-white grid place-items-center font-bold hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                aria-label="All invoices"
                title="All invoices"
              >
                ¶
              </Link>
              <div>
                <div className="font-semibold leading-tight">
                  Invoice Studio
                </div>
                <div className="text-xs text-slate-500 leading-tight">
                  {id ? `Saved · ${id.slice(0, 8)}` : "New draft"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SaveStatus
                status={
                  !id && lastSaved && status.kind === "saved"
                    ? { kind: "idle" }
                    : status
                }
                autosave={!!id}
              />
              {!id && lastSaved && (
                <Link
                  href={`/invoices/${lastSaved.id}`}
                  className="text-xs text-emerald-700 hover:text-emerald-900 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Saved {lastSaved.number} ✓ View
                </Link>
              )}
              {!id && (
                <button
                  type="button"
                  onClick={handleSaveNew}
                  disabled={status.kind === "saving"}
                  className="px-3 py-2 text-sm rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50"
                >
                  {status.kind === "saving" ? "Saving…" : "Save"}
                </button>
              )}
              <Link
                href="/invoices"
                className="hidden sm:inline-flex px-3 py-2 text-sm rounded-lg ring-1 ring-slate-300 bg-white hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                All invoices
              </Link>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfBusy || !validation.ok}
                title={
                  validation.ok
                    ? undefined
                    : "Fix the required fields before downloading"
                }
                className="px-3 py-2 text-sm rounded-lg ring-1 ring-slate-300 bg-white hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pdfBusy ? "Preparing…" : "Download PDF"}
              </button>
            </div>
          </div>
          <div className="no-print lg:hidden max-w-7xl mx-auto px-4 pb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setTab("edit")}
              className={`flex-1 py-2 text-sm rounded-lg ${tab === "edit" ? "bg-slate-900 text-white" : "ring-1 ring-slate-300 bg-white"}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={`flex-1 py-2 text-sm rounded-lg ${tab === "preview" ? "bg-slate-900 text-white" : "ring-1 ring-slate-300 bg-white"}`}
            >
              Preview
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-2 gap-6">
          <section
            className={`no-print space-y-4 ${tab === "edit" ? "" : "hidden"} lg:block`}
            aria-label="Invoice editor"
          >
            <Card title="Invoice details">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Invoice number *" htmlFor="inv-num">
                  <input
                    id="inv-num"
                    className={`${inputCls} ${invalidFields.has("invoice_number") ? "border-amber-500 focus:border-amber-600 focus:ring-amber-500/20" : ""}`}
                    value={invoice.invoice_number}
                    onChange={(e) => patch({ invoice_number: e.target.value })}
                    required
                    aria-invalid={
                      invalidFields.has("invoice_number") || undefined
                    }
                    aria-describedby={
                      invalidFields.has("invoice_number")
                        ? "inv-num-err"
                        : undefined
                    }
                  />
                  <FieldError
                    id="inv-num-err"
                    show={invalidFields.has("invoice_number")}
                  >
                    Invoice number is required.
                  </FieldError>
                </Field>
                <div />
                <Field label="Issue date" htmlFor="issue">
                  <input
                    id="issue"
                    type="date"
                    className={inputCls}
                    value={invoice.issue_date}
                    onChange={(e) => patch({ issue_date: e.target.value })}
                  />
                </Field>
                <Field label="Due date" htmlFor="due">
                  <input
                    id="due"
                    type="date"
                    className={inputCls}
                    value={invoice.due_date}
                    onChange={(e) => patch({ due_date: e.target.value })}
                  />
                </Field>
              </div>
            </Card>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card title="From">
                <PartyFields
                  prefix="biz"
                  party={invoice.business}
                  onChange={(business) => patch({ business })}
                  nameInvalid={invalidFields.has("business.name")}
                  nameLabel="From"
                />
              </Card>
              <Card title="Bill to">
                <PartyFields
                  prefix="cus"
                  party={invoice.customer}
                  onChange={(customer) => patch({ customer })}
                  nameInvalid={invalidFields.has("customer.name")}
                  nameLabel="Bill to"
                />
              </Card>
            </div>

            <Card
              title="Line items"
              action={
                <button
                  type="button"
                  onClick={addLine}
                  className={btnGhost}
                  aria-label="Add line item"
                >
                  + Add
                </button>
              }
            >
              <ul className="space-y-3">
                {invoice.line_items.map((it, i) => {
                  const descInvalid = invalidFields.has(
                    `line_items.${i}.description`,
                  );
                  const priceInvalid = invalidFields.has(
                    `line_items.${i}.unit_price_cents`,
                  );
                  return (
                    <li
                      key={it.id}
                      className="grid grid-cols-12 gap-2 items-start"
                    >
                      <div className="col-span-12 sm:col-span-6">
                        <Field
                          label={i === 0 ? "Description *" : ""}
                          htmlFor={`d-${it.id}`}
                          compact
                        >
                          <input
                            id={`d-${it.id}`}
                            className={`${inputCls} ${descInvalid ? "border-amber-500 focus:border-amber-600 focus:ring-amber-500/20" : ""}`}
                            value={it.description}
                            onChange={(e) =>
                              patchLine(i, { description: e.target.value })
                            }
                            placeholder="What are you billing for?"
                            aria-invalid={descInvalid || undefined}
                            aria-describedby={
                              descInvalid ? `d-${it.id}-err` : undefined
                            }
                          />
                          <FieldError
                            id={`d-${it.id}-err`}
                            show={descInvalid}
                          >
                            Required.
                          </FieldError>
                        </Field>
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <Field
                          label={i === 0 ? "Qty" : ""}
                          htmlFor={`q-${it.id}`}
                          compact
                        >
                          <input
                            id={`q-${it.id}`}
                            type="number"
                            min="0"
                            step="any"
                            inputMode="decimal"
                            className={inputCls + " tabular-nums text-right"}
                            value={it.qty}
                            onChange={(e) =>
                              patchLine(i, {
                                qty: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                          />
                        </Field>
                      </div>
                      <div className="col-span-6 sm:col-span-3">
                        <Field
                          label={i === 0 ? "Unit price *" : ""}
                          htmlFor={`u-${it.id}`}
                          compact
                        >
                          <input
                            key={`${it.id}-${formVersion}`}
                            id={`u-${it.id}`}
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            className={`${inputCls} tabular-nums text-right ${priceInvalid ? "border-amber-500 focus:border-amber-600 focus:ring-amber-500/20" : ""}`}
                            defaultValue={
                              it.unit_price_cents > 0
                                ? centsToDollarsInput(it.unit_price_cents)
                                : ""
                            }
                            onChange={(e) =>
                              patchLine(i, {
                                unit_price_cents: Math.max(
                                  0,
                                  dollarsToCents(e.target.value),
                                ),
                              })
                            }
                            aria-invalid={priceInvalid || undefined}
                            aria-describedby={
                              priceInvalid ? `u-${it.id}-err` : undefined
                            }
                          />
                          <FieldError
                            id={`u-${it.id}-err`}
                            show={priceInvalid}
                          >
                            Must be greater than 0.
                          </FieldError>
                        </Field>
                      </div>
                      <div
                        className={`col-span-3 sm:col-span-1 flex justify-end ${i === 0 ? "pt-6" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          className="text-slate-400 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded p-2"
                          aria-label={`Remove line item ${i + 1}`}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
                {invoice.line_items.length === 0 && (
                  <li className="text-sm text-slate-500 italic">
                    No line items yet.
                  </li>
                )}
              </ul>
            </Card>

            <Card title="Totals adjustments">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Discount (USD)" htmlFor="discount">
                  <input
                    key={`discount-${formVersion}`}
                    id="discount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    className={inputCls + " tabular-nums"}
                    defaultValue={
                      invoice.discount_cents > 0
                        ? centsToDollarsInput(invoice.discount_cents)
                        : ""
                    }
                    onChange={(e) =>
                      patch({
                        discount_cents: Math.max(
                          0,
                          dollarsToCents(e.target.value),
                        ),
                      })
                    }
                    aria-describedby="discount-help"
                  />
                  <p id="discount-help" className="text-xs text-slate-500 mt-1">
                    Fixed amount. Capped at subtotal.
                  </p>
                  {subtotalExceedsDiscountWarning && (
                    <p
                      className="text-xs text-amber-700 mt-1"
                      role="status"
                    >
                      Discount exceeds subtotal — will be clamped.
                    </p>
                  )}
                </Field>
                <Field label="Tax rate (%)" htmlFor="tax">
                  <input
                    key={`tax-${formVersion}`}
                    id="tax"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    className={inputCls + " tabular-nums"}
                    defaultValue={
                      invoice.tax_rate_bp > 0
                        ? (invoice.tax_rate_bp / 100).toFixed(2)
                        : ""
                    }
                    onChange={(e) =>
                      patch({
                        tax_rate_bp: Math.max(
                          0,
                          Math.round((Number(e.target.value) || 0) * 100),
                        ),
                      })
                    }
                  />
                </Field>
              </div>
              <dl className="mt-4 text-sm space-y-1 border-t border-slate-100 pt-3">
                <TotalsRow
                  label="Subtotal"
                  value={formatUSD(totals.subtotal_cents)}
                />
                {totals.discount_cents > 0 && (
                  <TotalsRow
                    label="Discount"
                    value={`− ${formatUSD(totals.discount_cents)}`}
                  />
                )}
                {totals.tax_cents > 0 && (
                  <TotalsRow
                    label={`Tax (${(invoice.tax_rate_bp / 100).toFixed(2)}%)`}
                    value={formatUSD(totals.tax_cents)}
                  />
                )}
                <TotalsRow
                  label="Grand total"
                  value={formatUSD(totals.grand_total_cents)}
                  bold
                />
              </dl>
            </Card>

            <Card
              title="Custom fields"
              action={
                <button
                  type="button"
                  onClick={addCustom}
                  className={btnGhost}
                >
                  + Add
                </button>
              }
            >
              <p className="text-xs text-slate-500 mb-3">
                Labelled extras shown on the invoice. Toggle visibility to omit
                from preview, email, and PDF.
              </p>
              <ul className="space-y-2">
                {invoice.custom_fields.map((f, i) => (
                  <li
                    key={f.id}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <input
                      className={inputCls + " col-span-12 sm:col-span-4"}
                      placeholder="Label"
                      value={f.label}
                      onChange={(e) =>
                        patchCustom(i, { label: e.target.value })
                      }
                      aria-label={`Custom field ${i + 1} label`}
                    />
                    <input
                      className={inputCls + " col-span-9 sm:col-span-6"}
                      placeholder="Value"
                      value={f.value}
                      onChange={(e) =>
                        patchCustom(i, { value: e.target.value })
                      }
                      aria-label={`Custom field ${i + 1} value`}
                    />
                    <label className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={f.visible}
                        onChange={(e) =>
                          patchCustom(i, { visible: e.target.checked })
                        }
                        className="size-4"
                        aria-label={`Visible on invoice`}
                      />
                      <span className="hidden sm:inline">Show</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeCustom(i)}
                      className="col-span-1 text-slate-400 hover:text-red-600 rounded p-2"
                      aria-label={`Remove custom field ${i + 1}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
                {invoice.custom_fields.length === 0 && (
                  <li className="text-sm text-slate-500 italic">
                    No custom fields yet.
                  </li>
                )}
              </ul>
            </Card>

            <Card title="Notes">
              <textarea
                className={inputCls + " min-h-24"}
                value={invoice.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="Payment terms, thank-you note, etc."
                aria-label="Invoice notes"
              />
            </Card>

            <Card title="Send">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                <Field label="Recipient email" htmlFor="to" compact>
                  <input
                    id="to"
                    type="email"
                    className={inputCls}
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={
                    emailStatus.kind === "sending" || !id || !validation.ok
                  }
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    !validation.ok
                      ? "Fix the required fields first"
                      : !id
                        ? "Save the invoice first"
                        : "Send invoice email with PDF attached"
                  }
                >
                  {emailStatus.kind === "sending" ? "Sending…" : "Send email + PDF"}
                </button>
              </div>
              <EmailStatusLine status={emailStatus} saved={!!id} />
            </Card>
          </section>

          <section
            className={`${tab === "preview" ? "" : "hidden"} lg:block`}
            aria-label="Live preview"
          >
            <div className="lg:sticky lg:top-24">
              <InvoicePreview data={preview} />
            </div>
          </section>
        </main>
      </div>

      <div className="hidden print:block" aria-hidden="true">
        <InvoicePreview data={preview} />
      </div>

      <div
        ref={pdfRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "800px",
          pointerEvents: "none",
          background: "#ffffff",
        }}
      >
        <InvoicePreview data={preview} />
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 placeholder:text-slate-400";

const btnGhost =
  "text-sm font-medium px-2 py-1 rounded-md text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function FieldError({
  id,
  show,
  children,
}: {
  id?: string;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <p
      id={id}
      className="text-xs text-amber-700 mt-1"
      role="alert"
    >
      {children}
    </p>
  );
}

function Field({
  label,
  htmlFor,
  children,
  compact,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const required = label.endsWith(" *");
  const text = required ? label.slice(0, -2) : label;
  return (
    <div>
      {label && (
        <label
          htmlFor={htmlFor}
          className={`block text-xs font-medium text-slate-600 ${compact ? "mb-1" : "mb-1.5"}`}
        >
          {text}
          {required && (
            <span
              aria-hidden="true"
              className="text-red-600 ml-0.5"
              title="Required"
            >
              *
            </span>
          )}
        </label>
      )}
      {children}
    </div>
  );
}

function PartyFields({
  prefix,
  party,
  onChange,
  nameInvalid,
  nameLabel,
}: {
  prefix: string;
  party: { name: string; email: string; address: string };
  onChange: (p: { name: string; email: string; address: string }) => void;
  nameInvalid?: boolean;
  nameLabel: string;
}) {
  const errId = `${prefix}-name-err`;
  return (
    <div className="space-y-2">
      <Field
        label="Name *"
        htmlFor={`${prefix}-name`}
        compact
      >
        <input
          id={`${prefix}-name`}
          className={`${inputCls} ${nameInvalid ? "border-amber-500 focus:border-amber-600 focus:ring-amber-500/20" : ""}`}
          value={party.name}
          onChange={(e) => onChange({ ...party, name: e.target.value })}
          required
          aria-invalid={nameInvalid || undefined}
          aria-describedby={nameInvalid ? errId : undefined}
        />
        <FieldError id={errId} show={!!nameInvalid}>
          {nameLabel} name is required.
        </FieldError>
      </Field>
      <Field label="Email" htmlFor={`${prefix}-email`} compact>
        <input
          id={`${prefix}-email`}
          type="email"
          className={inputCls}
          value={party.email}
          onChange={(e) => onChange({ ...party, email: e.target.value })}
        />
      </Field>
      <Field label="Address" htmlFor={`${prefix}-addr`} compact>
        <textarea
          id={`${prefix}-addr`}
          className={inputCls + " min-h-16"}
          value={party.address}
          onChange={(e) => onChange({ ...party, address: e.target.value })}
        />
      </Field>
    </div>
  );
}

function TotalsRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${bold ? "pt-2 mt-2 border-t-2 border-slate-900 text-base font-semibold" : ""}`}
    >
      <dt className={bold ? "" : "text-slate-600"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function SaveStatus({
  status,
  autosave,
}: {
  status: SaveStatusT;
  autosave: boolean;
}) {
  const map: Record<SaveStatusT["kind"], { text: string; color: string }> = {
    idle: {
      text: autosave ? "Autosave on" : "",
      color: "text-slate-400",
    },
    saving: { text: "Saving…", color: "text-slate-500" },
    saved: { text: "Saved ✓", color: "text-emerald-700" },
    error: {
      text: `Error: ${status.kind === "error" ? status.message : ""}`,
      color: "text-red-700",
    },
  };
  const m = map[status.kind];
  if (!m.text) return null;
  return (
    <span className={`text-xs ${m.color}`} role="status" aria-live="polite">
      {m.text}
    </span>
  );
}

function EmailStatusLine({
  status,
  saved,
}: {
  status: EmailStatusT;
  saved: boolean;
}) {
  if (!saved) {
    return (
      <p className="text-xs text-slate-500 mt-2">
        Save the invoice before sending — the email reads from the saved copy
        and attaches a fresh PDF.
      </p>
    );
  }
  if (status.kind === "idle") {
    return (
      <p className="text-xs text-slate-500 mt-2">
        Sends an HTML email with a PDF attachment.
      </p>
    );
  }
  if (status.kind === "sending")
    return <p className="text-xs text-slate-500 mt-2">Sending…</p>;
  if (status.kind === "sent")
    return (
      <p
        className="text-xs text-emerald-700 mt-2"
        role="status"
        aria-live="polite"
      >
        Email sent with PDF attached ✓
      </p>
    );
  return (
    <p
      className="text-xs text-red-700 mt-2"
      role="alert"
      aria-live="assertive"
    >
      {status.message}
    </p>
  );
}
