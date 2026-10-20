export default function InvoiceEditorLoading() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-slate-900 text-white grid place-items-center font-bold">
              ¶
            </div>
            <div>
              <div className="font-semibold leading-tight">Invoice Studio</div>
              <div className="text-xs text-slate-500 leading-tight">
                Loading…
              </div>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="flex items-center gap-2"
          >
            <div className="h-9 w-24 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-9 w-32 rounded-lg bg-slate-200 animate-pulse" />
          </div>
        </div>
      </header>

      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-2 gap-6"
        aria-busy="true"
        aria-live="polite"
      >
        <section className="space-y-4" aria-label="Loading editor">
          <SkeletonCard rows={2} />
          <div className="grid sm:grid-cols-2 gap-4">
            <SkeletonCard rows={3} />
            <SkeletonCard rows={3} />
          </div>
          <SkeletonCard rows={3} />
          <SkeletonCard rows={2} />
        </section>
        <section className="hidden lg:block" aria-label="Loading preview">
          <div className="bg-white rounded-xl ring-1 ring-slate-200 p-8 shadow-xs animate-pulse">
            <div className="flex justify-between pb-6 border-b border-slate-100">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-slate-200 rounded" />
                <div className="h-6 w-28 bg-slate-200 rounded" />
                <div className="h-3 w-32 bg-slate-200 rounded mt-3" />
                <div className="h-3 w-40 bg-slate-200 rounded" />
              </div>
              <div className="text-right space-y-2">
                <div className="h-3 w-20 bg-slate-200 rounded ml-auto" />
                <div className="h-7 w-28 bg-slate-200 rounded ml-auto" />
              </div>
            </div>
            <div className="py-6 space-y-3">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-56 bg-slate-200 rounded" />
            </div>
            <div className="pt-4 space-y-3">
              <div className="h-10 w-full bg-slate-100 rounded" />
              <div className="h-6 w-full bg-slate-100 rounded" />
              <div className="h-6 w-full bg-slate-100 rounded" />
              <div className="h-6 w-2/3 ml-auto bg-slate-200 rounded mt-6" />
            </div>
          </div>
        </section>
        <span className="sr-only">Loading invoice…</span>
      </main>
    </div>
  );
}

function SkeletonCard({ rows }: { rows: number }) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 p-4 shadow-xs animate-pulse">
      <div className="h-3 w-24 bg-slate-200 rounded mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-9 w-full bg-slate-100 rounded" />
        ))}
      </div>
    </div>
  );
}
