-- 0003_rls_lockdown.sql
--
-- Locks down every public table to service-role-only access.
--
-- Audit findings (see PR description for full before/after advisor output):
--   - All server-side API routes use the Supabase service_role key
--     (src/lib/supabaseServer.ts), which bypasses RLS entirely. No
--     client-side (browser) Supabase usage was found anywhere in the app
--     (grep for createClient/NEXT_PUBLIC_SUPABASE/SUPABASE_ANON outside
--     src/lib/supabaseServer.ts and src/app/api/** returned nothing).
--   - Therefore every table below gets RLS enabled with ZERO policies for
--     anon/authenticated. RLS-enabled + no policies = default-deny for
--     every role except service_role (which bypasses RLS natively), so no
--     explicit service_role policy is required either.
--   - None of these tables need narrow read policies, because nothing in
--     the app queries Supabase directly from the browser.
--
-- Tables that already had RLS enabled (from earlier migrations) but no
-- policies are untouched here: businesses, contacts, memberships,
-- playbook, lead_drafts, appointments, email_log.

ALTER TABLE "public"."cancelled_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."past_due" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sms_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."examples" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."digests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."campaign_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."marketing_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."birthdays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."trial_conversion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_unsubscribes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sms_unsubscribes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_campaign_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."archived_rows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_campaigns_spark" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_results_6mo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."member_activity" ENABLE ROW LEVEL SECURITY;
