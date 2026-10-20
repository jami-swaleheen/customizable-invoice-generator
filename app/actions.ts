"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendInvoiceEmail } from "@/lib/email";
import {
  invoiceInputSchema,
  invoiceRowSchema,
  sendEmailSchema,
  type InvoiceInput,
  type InvoiceRow,
} from "@/lib/schema";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function saveInvoice(
  input: InvoiceInput,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = invoiceInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const payload = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .update(payload)
      .eq("id", id)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/invoices/${data.id}`);
    return { ok: true, data: { id: data.id } };
  }

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/invoices/${data.id}`);
  return { ok: true, data: { id: data.id } };
}

export async function deleteInvoice(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const { error } = await supabaseAdmin
    .from("invoices")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/invoices");
  return { ok: true, data: { id } };
}

export async function loadInvoice(
  id: string,
): Promise<ActionResult<InvoiceRow>> {
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return { ok: false, error: error.message };
  const parsed = invoiceRowSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: "Invoice shape mismatch" };
  }
  return { ok: true, data: parsed.data };
}

export async function emailInvoice(
  invoice_id: string,
  to: string,
  pdfBase64?: string,
): Promise<ActionResult<{ id?: string }>> {
  const parsed = sendEmailSchema.safeParse({ invoice_id, to });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const loaded = await loadInvoice(parsed.data.invoice_id);
  if (!loaded.ok) return loaded;
  try {
    const result = await sendInvoiceEmail(
      loaded.data,
      parsed.data.to,
      pdfBase64,
    );
    return { ok: true, data: { id: result?.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email failed" };
  }
}
