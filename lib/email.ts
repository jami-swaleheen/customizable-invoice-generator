import "server-only";
import { Resend } from "resend";
import type { InvoiceRow } from "./schema";
import { computeTotals, formatUSD } from "./calc";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";

export async function sendInvoiceEmail(
  invoice: InvoiceRow,
  to: string,
  pdfBase64?: string,
) {
  if (!apiKey) {
    throw new Error(
      "Missing RESEND_API_KEY. Set it in .env.local (see .env.example).",
    );
  }
  const resend = new Resend(apiKey);
  const totals = computeTotals(
    invoice.line_items,
    invoice.discount_cents,
    invoice.tax_rate_bp,
  );

  const html = renderInvoiceEmail(invoice, totals);
  const subject = `Invoice ${invoice.invoice_number} from ${invoice.business.name || "your supplier"} — ${formatUSD(totals.grand_total_cents)}`;

  const attachments = pdfBase64
    ? [
        {
          filename: `invoice-${invoice.invoice_number}.pdf`,
          content: pdfBase64,
        },
      ]
    : undefined;

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    attachments,
  });

  if (error) throw new Error(error.message);
  return data;
}

function renderInvoiceEmail(
  inv: InvoiceRow,
  totals: ReturnType<typeof computeTotals>,
): string {
  const esc = escapeHtml;

  const itemRows = inv.line_items
    .map(
      (it, i) => `
      <tr>
        <td style="padding:10px 8px 10px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;word-break:break-word;overflow-wrap:anywhere;vertical-align:top;">${esc(it.description || "—")}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;text-align:right;font-variant-numeric:tabular-nums;vertical-align:top;">${it.qty}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;text-align:right;font-variant-numeric:tabular-nums;vertical-align:top;">${formatUSD(it.unit_price_cents)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;vertical-align:top;">${formatUSD(totals.line_totals_cents[i] ?? 0)}</td>
      </tr>`,
    )
    .join("");

  const customFieldRows = inv.custom_fields
    .filter((f) => f.visible && (f.label.trim() || f.value.trim()))
    .map(
      (f) => `
      <tr>
        <td style="padding:4px 0;color:#64748b;font-size:13px;">${esc(f.label)}</td>
        <td style="padding:4px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${esc(f.value)}</td>
      </tr>`,
    )
    .join("");

  const totalsRow = (label: string, value: string, bold = false) => `
    <tr>
      <td style="padding:6px 0;color:${bold ? "#0f172a" : "#64748b"};font-size:${bold ? "15px" : "13px"};${bold ? "font-weight:700;border-top:2px solid #0f172a;padding-top:10px;" : ""}">${label}</td>
      <td style="padding:6px 0;color:#0f172a;font-size:${bold ? "17px" : "13px"};font-weight:${bold ? "700" : "600"};text-align:right;font-variant-numeric:tabular-nums;${bold ? "border-top:2px solid #0f172a;padding-top:10px;" : ""}">${value}</td>
    </tr>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${esc(inv.invoice_number)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">

          <tr>
            <td style="padding:32px 32px 24px 32px;border-bottom:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:top;">
                    <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:4px;">Invoice</div>
                    <div style="font-size:22px;font-weight:700;color:#0f172a;">${esc(inv.invoice_number)}</div>
                    <div style="margin-top:12px;font-size:13px;color:#334155;line-height:1.5;">
                      <div style="font-weight:600;color:#0f172a;">${esc(inv.business.name) || "&nbsp;"}</div>
                      ${inv.business.email ? `<div>${esc(inv.business.email)}</div>` : ""}
                      ${inv.business.address ? `<div>${esc(inv.business.address).replace(/\n/g, "<br>")}</div>` : ""}
                    </div>
                  </td>
                  <td style="vertical-align:top;text-align:right;">
                    <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:4px;">Amount due</div>
                    <div style="font-size:28px;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;">${formatUSD(totals.grand_total_cents)}</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;margin-left:auto;">
                      <tr>
                        <td style="padding-right:8px;color:#64748b;font-size:12px;">Issued</td>
                        <td style="color:#0f172a;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;">${esc(inv.issue_date)}</td>
                      </tr>
                      <tr>
                        <td style="padding-right:8px;color:#64748b;font-size:12px;padding-top:2px;">Due</td>
                        <td style="color:#0f172a;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;padding-top:2px;">${esc(inv.due_date)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:top;width:50%;padding-right:12px;">
                    <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Bill to</div>
                    <div style="font-size:14px;color:#0f172a;font-weight:600;">${esc(inv.customer.name) || "&nbsp;"}</div>
                    ${inv.customer.email ? `<div style="font-size:13px;color:#334155;">${esc(inv.customer.email)}</div>` : ""}
                    ${inv.customer.address ? `<div style="font-size:13px;color:#334155;line-height:1.5;">${esc(inv.customer.address).replace(/\n/g, "<br>")}</div>` : ""}
                  </td>
                  <td style="vertical-align:top;width:50%;padding-left:12px;">
                    ${
                      customFieldRows
                        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${customFieldRows}</table>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <thead>
                  <tr>
                    <th align="left" style="padding:0 0 8px 0;border-bottom:1px solid #cbd5e1;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;">Description</th>
                    <th align="right" style="padding:0 0 8px 0;border-bottom:1px solid #cbd5e1;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;width:50px;">Qty</th>
                    <th align="right" style="padding:0 0 8px 0;border-bottom:1px solid #cbd5e1;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;width:90px;">Unit</th>
                    <th align="right" style="padding:0 0 8px 0;border-bottom:1px solid #cbd5e1;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;width:90px;">Total</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="260" style="margin-top:20px;margin-left:auto;">
                ${totalsRow("Subtotal", formatUSD(totals.subtotal_cents))}
                ${totals.discount_cents > 0 ? totalsRow("Discount", `− ${formatUSD(totals.discount_cents)}`) : ""}
                ${totals.tax_cents > 0 ? totalsRow(`Tax (${(inv.tax_rate_bp / 100).toFixed(2)}%)`, formatUSD(totals.tax_cents)) : ""}
                ${totalsRow("Grand total", formatUSD(totals.grand_total_cents), true)}
              </table>
            </td>
          </tr>

          ${
            inv.notes
              ? `<tr>
            <td style="padding:16px 32px 32px 32px;border-top:1px solid #e5e7eb;color:#334155;font-size:13px;line-height:1.6;white-space:pre-wrap;">${esc(inv.notes)}</td>
          </tr>`
              : `<tr><td style="padding-bottom:32px;"></td></tr>`
          }

        </table>

        <div style="max-width:640px;margin:16px auto 0;text-align:center;font-size:11px;color:#94a3b8;">
          Sent from Invoice Studio
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
