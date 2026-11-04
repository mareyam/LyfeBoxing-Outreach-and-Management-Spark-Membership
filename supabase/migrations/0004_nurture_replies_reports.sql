-- Nurture sequence, reply tracking, appointment reminders, and daily reports.
-- All scoped by business_id, same pattern as 0002_lead_followups.sql.

create table if not exists public.nurture_steps (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  step_no int not null,
  delay_days int not null default 0,
  subject text default '',
  body text default '', -- supports {first_name}
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, step_no)
);

drop trigger if exists nurture_steps_updated_at on public.nurture_steps;
create trigger nurture_steps_updated_at before update on public.nurture_steps
for each row execute function public.set_updated_at();

-- One enrollment per lead. Leads are unique by (name, email) already, so
-- deduping on lead_id is sufficient to never double-enroll the same lead.
create table if not exists public.nurture_enrollments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  lead_id uuid not null references public.leads(id),
  current_step int not null default 0,
  next_send_at timestamptz,
  status text not null default 'active', -- active | paused | stopped_unsubscribed | stopped_interested | completed
  enrolled_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (lead_id)
);

create index if not exists nurture_enrollments_business_idx on public.nurture_enrollments (business_id, status, next_send_at);

drop trigger if exists nurture_enrollments_updated_at on public.nurture_enrollments;
create trigger nurture_enrollments_updated_at before update on public.nurture_enrollments
for each row execute function public.set_updated_at();

create table if not exists public.lead_replies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  lead_id uuid not null references public.leads(id),
  received_at timestamptz default now(),
  from_email text,
  subject text default '',
  snippet text default '',
  full_text text default '',
  category text not null default 'other', -- interested | positive | not_interested | unsubscribe | question | other
  handled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists lead_replies_business_idx on public.lead_replies (business_id, category, handled);
create index if not exists lead_replies_lead_idx on public.lead_replies (lead_id);

drop trigger if exists lead_replies_updated_at on public.lead_replies;
create trigger lead_replies_updated_at before update on public.lead_replies
for each row execute function public.set_updated_at();

-- appointments already exists (0002_lead_followups.sql). Add reminder tracking
-- and widen status to include 'showed' alongside the existing values.
alter table public.appointments add column if not exists reminder_3d_sent_at timestamptz;
alter table public.appointments add column if not exists reminder_1d_sent_at timestamptz;

alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status in ('booked', 'attended', 'showed', 'no_show', 'cancelled'));

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  report_date date not null,
  new_leads int default 0,
  nurture_sent int default 0,
  replies_by_category jsonb default '{}'::jsonb,
  unsubscribes int default 0,
  calendar_links_sent int default 0,
  appointments_booked int default 0,
  reminders_sent int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, report_date)
);

drop trigger if exists daily_reports_updated_at on public.daily_reports;
create trigger daily_reports_updated_at before update on public.daily_reports
for each row execute function public.set_updated_at();

-- Leads must never be deleted; these flags track outcomes instead.
alter table public.leads add column if not exists opted_out boolean default false;
alter table public.leads add column if not exists interested boolean default false;

alter table public.nurture_steps enable row level security;
alter table public.nurture_enrollments enable row level security;
alter table public.lead_replies enable row level security;
alter table public.daily_reports enable row level security;
-- No public policies: service role key only, server-side.
