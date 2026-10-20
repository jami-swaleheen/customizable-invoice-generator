"use client";

import { useState } from "react";
import InvoiceEditor from "@/components/InvoiceEditor";
import { blankInvoice } from "@/lib/blank-invoice";
import { readDraft } from "@/lib/draft";

export default function NewInvoiceClient() {
  const [initial] = useState(() => readDraft() ?? blankInvoice());
  return <InvoiceEditor initial={initial} />;
}
