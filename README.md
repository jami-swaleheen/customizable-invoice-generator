# Invoice Studio

A browser-based, customizable invoice generator for a small business. Built as a 3-hour interview exercise.

**Live demo:** _add Vercel URL after deploy_
**Walkthrough:** _add Loom URL_

---

## What it does

- **Editor + live preview** side-by-side on desktop, tabbed on mobile.
- **Line items** with description, quantity, unit price. Add / remove freely.
- **Totals** in USD. Per-line rounding, then subtotal → fixed discount (clamped to subtotal) → percentage tax, re-rounded. Matches the brief's sanity check: `2 × $50 − $10 + 10% = $99.00`.
- **Custom fields** — add label/value pairs, toggle visibility, remove. Hidden fields never render in preview, email, or print.
- **Save & reload** — invoices persist in Supabase, each reachable at `/invoices/<uuid>`.
- **Email** — send a nicely-formatted HTML copy via Resend.
- **Print / PDF** — browser Print prints only the invoice; controls and hidden fields are suppressed via `@media print`.
- **Responsive + accessible** — keyboard-reachable, labelled inputs, visible focus, mobile layout.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (no component library — hand-rolled to keep the build small) |
| Backend | Next.js **Server Actions** (no separate Express/Node server) |
| Database | Supabase (Postgres), single `invoices` table with JSONB for line items and custom fields |
| Email | Resend (free tier, no credit card required) |
| PDF | Browser Print + `@media print` CSS (brief explicitly allows this) |
| Validation | Zod schemas shared by client and server |
| Tests | Vitest (money math) |
| Deploy | Vercel |

## Run locally

```bash
# 1. Install deps
npm install --legacy-peer-deps

# 2. Set up environment
cp .env.example .env.local
# then edit .env.local with your Supabase + Resend values

# 3. Create the DB table
#    Open your Supabase project → SQL Editor → paste the contents of
#    supabase/schema.sql → Run

# 4. Dev server
npm run dev

# 5. Tests
npm test
```

Open [http://localhost:3000](http://localhost:3000). The home page loads with a sensible fictional invoice. Click **Save** to persist it; you'll be redirected to `/invoices/<uuid>`. That URL survives reload. Fill in the recipient email and click **Send email**.

## Services setup

### Supabase (storage)

1. Sign up at [supabase.com](https://supabase.com) (free, no card).
2. New project → wait for it to provision.
3. **SQL Editor → New query** → paste `supabase/schema.sql` → **Run**.
4. **Project Settings → API** → copy the **URL** and the **service_role** key into `.env.local`.

The `service_role` key bypasses RLS and must never leave the server. In this app it's only imported in `lib/supabase/server.ts`, which starts with `import "server-only"` so a client-component import would fail at build time.

### Resend (email)

1. Sign up at [resend.com](https://resend.com) (free, no card).
2. **API Keys → Create** → paste the `re_…` key into `.env.local`.
3. The default `RESEND_FROM` is `onboarding@resend.dev`, Resend's shared sandbox sender. **On the free tier without a verified domain, you can only send to the email you signed up with.** That matches the brief's "test emails only to an address you control." If you later verify a domain in Resend, set `RESEND_FROM=hello@your-domain.com`.

### Deploy to Vercel

1. Push to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. Add the three env vars from `.env.example` in the Vercel project settings (Production + Preview).
4. Deploy.

## Decisions

- **One Next.js app, no Express.** Server Actions give the same request-time isolation (`process.env` lives server-side), without the double-deploy and CORS overhead. For a 3-hour exercise this was the single biggest time saver.
- **Supabase over local SQLite.** SQLite on Vercel does not persist — serverless invocations get a fresh, read-only filesystem. The hosted-DB tradeoff was unavoidable; Supabase was the fastest option.
- **JSONB for line items and custom fields.** Custom fields are per-invoice and unbounded; a side table would mean joins and extra round-trips. Line items don't need to be queried independently either, so a single-row read is a UX win for live preview.
- **Integer cents + tax in basis points.** Money as floats drifts; this spec specifically wants deterministic rounding (`line → sum → discount → round tax`), and integer math gives it for free. The `$99.00` check is a unit test in [`lib/calc.test.ts`](lib/calc.test.ts).
- **No shadcn/ui.** Tailwind v4 is new and the component surface here (inputs, cards, buttons) is small — hand-rolling Tailwind utility classes was faster than fighting a shadcn init.
- **No authentication.** The brief explicitly says auth is not required. Invoices are reachable by UUID at `/invoices/<id>` ("unlisted link" model — same idea as a Google Doc share link). In production this route would sit behind an auth gate with a per-user ownership check.
- **Browser Print for PDF.** The brief allows it. `@react-pdf/renderer` would have cost ~45 min of the 3-hour budget and the output would've looked similar.
- **Zod schemas shared client + server.** One source of truth, no drift. Server Actions validate every input before touching DB or Resend.
- **No autosave.** Spec allows either; explicit **Save** is clearer for the demo and avoids race conditions during the Loom walkthrough.

## AI tools used

- **Claude Code (Opus 4.7)** for scaffolding, writing most of the component code, and the money-math unit tests. All code was reviewed, run, and tested locally. The Vitest suite is my check that the `calc.ts` logic really matches the brief's `$99.00` requirement.

## Time spent

Approximately 3 hours total:

- 0:00 – 0:20 — Scaffold Next.js, install deps, Tailwind v4 + env setup
- 0:20 – 0:40 — `lib/calc.ts` + Vitest suite (the correctness heart of the app)
- 0:40 – 1:00 — `lib/schema.ts` + Supabase + Resend clients
- 1:00 – 2:00 — Editor, live preview, custom fields, line items
- 2:00 – 2:20 — Server Actions, `/invoices/[id]` route, print CSS
- 2:20 – 2:40 — Next 16 Cache Components fixes (Suspense boundary, `instant = false`) + lint cleanup
- 2:40 – 3:00 — README, `.env.example`, `supabase/schema.sql`, Loom

## Unfinished / known limitations

- **No authentication.** Anyone with an invoice URL can view and edit it. See "Decisions" — this is per the brief, and would be the first thing to add for production.
- **No invoice list page.** You get a URL after saving; there's no index of past invoices.
- **No per-field inline validation on the client** — the server validates and surfaces errors, but the client-side experience could be nicer (red borders on bad input, etc.).
- **No currency switching.** USD-only, as the brief specifies.
- **Email uses the shared `onboarding@resend.dev` sender.** Deliverability is sandbox-grade. Verifying a domain in Resend is a 5-minute follow-up.
- **No drag-reorder on line items or custom fields.** The brief doesn't ask for it; add/remove are enough.
- **No tests beyond `calc.ts`.** The math is the risky part; UI components are mostly declarative. In a longer engagement I'd add Playwright for the save→reload→email flow.
- **Light mode only.** Design is intentionally restrained; the preview is the hero.

## File map

```
app/
  page.tsx                      # New-invoice entry (Suspense around client)
  NewInvoiceClient.tsx          # Instantiates a fresh blank invoice
  invoices/[id]/page.tsx        # Loads invoice from Supabase by UUID
  actions.ts                    # "use server" — save, load, email
  layout.tsx                    # Root layout (Geist fonts, metadata)
  globals.css                   # Tailwind + print CSS
components/
  InvoiceEditor.tsx             # Client editor with live totals + preview
  InvoicePreview.tsx            # Presentational invoice (reused for print)
lib/
  calc.ts                       # Money math (integer cents, basis points)
  calc.test.ts                  # Vitest — includes the $99.00 check
  schema.ts                     # Zod schemas, source of truth for types
  blank-invoice.ts              # Seed data for a new draft
  supabase/server.ts            # service-role Supabase client (server-only)
  email.ts                      # Resend wrapper with HTML template
supabase/schema.sql             # Single DDL to paste into Supabase SQL editor
.env.example
```
