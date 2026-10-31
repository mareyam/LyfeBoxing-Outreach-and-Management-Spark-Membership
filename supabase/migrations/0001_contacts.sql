create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz default now()
);
insert into public.businesses (slug, name)
values ('lyfe-boxing','Lyfe Boxing') on conflict (slug) do nothing;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  spark_contact_id text not null,
  full_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  contact_type text,
  status text,
  date_entered date,
  birthday date,
  age int,
  gender text,
  address text,
  city text,
  state text,
  zip text,
  country text,
  last_seen_days int,
  prospect_phase text,
  trial_status text,
  trial_phase text,
  marketing_source text,
  marketing_source_detail text,
  referred_by text,
  tags text[] default '{}',
  email_unsubscribed boolean default false,
  sms_unsubscribed boolean default false,
  source text,
  extra jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, spark_contact_id)
);

create index if not exists contacts_email_idx on public.contacts (business_id, lower(email));
create index if not exists contacts_phone_idx on public.contacts (business_id, phone);
create index if not exists contacts_type_idx on public.contacts (business_id, contact_type);
create index if not exists contacts_name_idx on public.contacts (business_id, lower(full_name));

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists contacts_updated_at on public.contacts;
create trigger contacts_updated_at before update on public.contacts
for each row execute function public.set_updated_at();

alter table public.businesses enable row level security;
alter table public.contacts enable row level security;
-- No public policies: the app will use the service role key server-side only.
