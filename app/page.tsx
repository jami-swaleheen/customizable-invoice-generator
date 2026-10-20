"use client";

import dynamic from "next/dynamic";

const NewInvoiceClient = dynamic(() => import("./NewInvoiceClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen grid place-items-center text-slate-500">
      Loading editor…
    </div>
  ),
});

export default function Home() {
  return <NewInvoiceClient />;
}
