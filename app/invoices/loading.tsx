export default function InvoicesLoading() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-slate-900 text-white grid place-items-center font-bold">
              ¶
            </div>
            <div>
              <div className="font-semibold leading-tight">All invoices</div>
              <div className="text-xs text-slate-500 leading-tight">
                Loading…
              </div>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="h-9 w-32 rounded-lg bg-slate-200 animate-pulse"
          />
        </div>
      </header>

      <main
        className="max-w-6xl mx-auto px-4 sm:px-6 py-6"
        aria-busy="true"
        aria-live="polite"
      >
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <SkeletonCard />
            </li>
          ))}
        </ul>
        <span className="sr-only">Loading invoices…</span>
      </main>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 p-5 shadow-xs animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-3 w-20 rounded bg-slate-200" />
          <div className="h-4 w-40 rounded bg-slate-200 mt-2.5" />
        </div>
        <div className="text-right space-y-1.5">
          <div className="h-3 w-10 rounded bg-slate-200 ml-auto" />
          <div className="h-5 w-20 rounded bg-slate-200 ml-auto" />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-10 rounded bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-200" />
        </div>
        <div className="flex justify-between">
          <div className="h-3 w-10 rounded bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-200" />
        </div>
        <div className="flex justify-between">
          <div className="h-3 w-14 rounded bg-slate-200" />
          <div className="h-3 w-16 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
