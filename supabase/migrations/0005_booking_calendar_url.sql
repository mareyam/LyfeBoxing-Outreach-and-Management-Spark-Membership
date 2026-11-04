-- Settings field for the booking calendar link used by "Send calendar link".
alter table public.playbook add column if not exists booking_calendar_url text default '';
