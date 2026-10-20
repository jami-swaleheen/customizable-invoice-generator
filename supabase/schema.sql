-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.

create extension if not exists pgcrypto;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  issue_date date not null,
  due_date date not null,
  business jsonb not null,
  customer jsonb not null,
  notes text not null default '',
  line_items jsonb not null,
  custom_fields jsonb not null default '[]',
  discount_cents int not null default 0 check (discount_cents >= 0),
  tax_rate_bp int not null default 0 check (tax_rate_bp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS intentionally disabled: the exercise brief says auth is not required,
-- and all writes go through server-side Server Actions using the service-role key.
-- In production you'd enable RLS and gate /invoices/[id] behind auth.
alter table public.invoices disable row level security;
