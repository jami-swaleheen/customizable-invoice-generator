import type { InvoiceInput } from "./schema";

export const DRAFT_KEY = "invoice-studio:draft:v1";

export function readDraft(): InvoiceInput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InvoiceInput;
  } catch {
    return null;
  }
}

export function writeDraft(invoice: InvoiceInput): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(invoice));
  } catch {
    /* quota exceeded or disabled — ignore */
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
