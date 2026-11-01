-- Tables needed to run the daily lead follow-up system on Supabase instead of Google Sheets.
-- Everything is scoped by business_id so other businesses can reuse this schema later.

create table if not exists public.playbook (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  tone text default '',
  offers text default '',
  prices text default '',
  faqs text default '',
  trial_link text default '',
  booking_link text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id)
);

drop trigger if exists playbook_updated_at on public.playbook;
create trigger playbook_updated_at before update on public.playbook
for each row execute function public.set_updated_at();

-- One draft per lead per sequence step (or the literal step "no-show").
-- The unique constraint is what makes the cron job safe to re-run: it will
-- never create a second draft for a step that already has one.
create table if not exists public.lead_drafts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  lead_id uuid not null references public.leads(id),
  step text not null,
  subject text default '',
  body text default '',
  ai_original text default '',
  example_logged boolean default false,
  status text not null default 'draft', -- draft | needs_reply | approved | sent | skipped
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (lead_id, step)
);

create index if not exists lead_drafts_business_idx on public.lead_drafts (business_id, status);

drop trigger if exists lead_drafts_updated_at on public.lead_drafts;
create trigger lead_drafts_updated_at before update on public.lead_drafts
for each row execute function public.set_updated_at();

-- Intro / trial-class bookings. Booking an appointment stops that lead's
-- follow-up sequence (the cron job skips any lead with a booked appointment).
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  lead_id uuid references public.leads(id),
  scheduled_at timestamptz not null,
  type text not null default 'intro', -- intro | trial class
  status text not null default 'booked', -- booked | attended | no_show | cancelled
  source text default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists appointments_business_idx on public.appointments (business_id, scheduled_at);
create index if not exists appointments_lead_idx on public.appointments (lead_id);

drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at before update on public.appointments
for each row execute function public.set_updated_at();

-- A record of every email actually sent (by a human clicking Approve & Send),
-- across leads, campaigns, past-due, etc. Nothing writes here automatically.
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  lead_id uuid references public.leads(id),
  lead_draft_id uuid references public.lead_drafts(id),
  source text not null default 'lead_followup', -- lead_followup | campaign | past_due
  to_email text,
  subject text,
  body text,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists email_log_business_idx on public.email_log (business_id, sent_at);

alter table public.playbook enable row level security;
alter table public.lead_drafts enable row level security;
alter table public.appointments enable row level security;
alter table public.email_log enable row level security;
-- No public policies: the app talks to these tables with the service role key, server-side only.
