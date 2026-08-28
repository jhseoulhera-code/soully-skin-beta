-- ============================================================================
-- Anonymous diagnosis tracking + member skin-change history
-- ============================================================================
-- Additive migration. Does NOT touch skin_test_leads / skin_diagnoses from
-- supabase-schema.sql — those stay exactly as they are. This file only adds
-- new tables for the "anonymous visitor -> diagnosis session -> per-question
-- answers -> result -> (optional) linked member account" flow.
--
-- Run this in the Supabase SQL editor after supabase-schema.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. admins — minimal allow-list used by every "admin can view all ..."
--    policy below. Created first since those policies reference it. No
--    signup flow adds rows here; add the project owner's own auth.users id
--    manually after they've signed up once, e.g.:
--      insert into public.admins (user_id) values ('<their auth.users id>');
-- ----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id)
);

alter table public.admins enable row level security;
-- No policies are created for admins itself: PostgREST clients (anon and
-- authenticated alike) get zero access to this table by default once RLS is
-- enabled with no matching policy, which is exactly what we want — it's
-- managed only from the Supabase SQL editor / dashboard.

-- ----------------------------------------------------------------------------
-- 1. visitors — pre-login anonymous identity.
--    visitor_id is generated client-side (crypto.randomUUID()) and stored in
--    localStorage. No fingerprinting: device_type is a coarse
--    mobile/tablet/desktop bucket derived from the user agent, not the raw
--    user agent string itself, and nothing else about the device is stored.
-- ----------------------------------------------------------------------------
create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid unique not null,
  created_at timestamptz not null default now(),
  first_source text,
  first_campaign text,
  device_type text check (device_type in ('mobile', 'tablet', 'desktop', 'unknown'))
);

create index if not exists idx_visitors_visitor_id on public.visitors (visitor_id);

alter table public.visitors enable row level security;

-- Write-only from the browser: a visitor can create their own row once, no
-- read/update/delete surface is exposed to anon/authenticated clients.
create policy "anon can insert own visitor row"
on public.visitors
for insert
to anon, authenticated
with check (true);

-- ----------------------------------------------------------------------------
-- 2. diagnosis_sessions — one row per diagnosis attempt (QUICK or DEEP).
--    A new session_id is created every time a diagnosis is (re)started.
--    user_id starts null and is filled in later if/when the visitor signs
--    up or logs in (see linkVisitorSessionsToUser in src/diagnosisTracking.js).
-- ----------------------------------------------------------------------------
create table if not exists public.diagnosis_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique not null,
  visitor_id uuid not null references public.visitors(visitor_id),
  user_id uuid references auth.users(id),

  test_type text not null check (test_type in ('QUICK', 'DEEP')),
  status text not null default 'started' check (status in ('started', 'completed', 'abandoned')),
  current_question text,

  started_at timestamptz not null default now(),
  completed_at timestamptz,

  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,

  algorithm_version text,
  question_set_version text
);

create index if not exists idx_diagnosis_sessions_visitor_id on public.diagnosis_sessions (visitor_id);
create index if not exists idx_diagnosis_sessions_user_id on public.diagnosis_sessions (user_id);
create index if not exists idx_diagnosis_sessions_status on public.diagnosis_sessions (status);
create index if not exists idx_diagnosis_sessions_started_at on public.diagnosis_sessions (started_at desc);

alter table public.diagnosis_sessions enable row level security;

-- A session may be created either anonymously (user_id null) or, if already
-- signed in, directly attached to the current user — never to someone else.
create policy "create own diagnosis session"
on public.diagnosis_sessions
for insert
to anon, authenticated
with check (user_id is null or user_id = auth.uid());

-- Covers three cases with one rule, since Postgres ORs permissive policies:
--   a) anonymous progress updates (current_question/status) while user_id
--      is still null,
--   b) the sign-up/login moment where a null-owner session is claimed by
--      setting user_id = auth.uid(),
--   c) further updates (e.g. completing) once a session already belongs to
--      the signed-in user.
-- A row can never be moved to someone else's user_id, and a signed-in user
-- can only claim sessions that are still unclaimed.
create policy "update own or unclaimed diagnosis session"
on public.diagnosis_sessions
for update
to anon, authenticated
using (user_id is null or user_id = auth.uid())
with check (user_id is null or user_id = auth.uid());

create policy "member can view own diagnosis sessions"
on public.diagnosis_sessions
for select
to authenticated
using (user_id = auth.uid());

create policy "admin can view all diagnosis sessions"
on public.diagnosis_sessions
for select
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 3. diagnosis_answers — one row per question per session, saved the moment
--    an option is picked. Re-answering the same question (going back and
--    changing an answer) updates the existing row via upsert on
--    (session_id, question_id).
-- ----------------------------------------------------------------------------
create table if not exists public.diagnosis_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.diagnosis_sessions(session_id) on delete cascade,
  question_id text not null,
  answer_value numeric,
  answer_label text,
  option_index integer,
  response_time_ms integer,
  answered_at timestamptz not null default now(),
  question_version text,
  unique (session_id, question_id)
);

create index if not exists idx_diagnosis_answers_session_id on public.diagnosis_answers (session_id);

alter table public.diagnosis_answers enable row level security;

-- Answers can only be written into a session that is still anonymous
-- (unclaimed) or that belongs to the signed-in user writing it.
create policy "write answers into own or unclaimed session"
on public.diagnosis_answers
for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.diagnosis_sessions s
    where s.session_id = diagnosis_answers.session_id
      and (s.user_id is null or s.user_id = auth.uid())
  )
);

create policy "update answers in own or unclaimed session"
on public.diagnosis_answers
for update
to anon, authenticated
using (
  exists (
    select 1 from public.diagnosis_sessions s
    where s.session_id = diagnosis_answers.session_id
      and (s.user_id is null or s.user_id = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.diagnosis_sessions s
    where s.session_id = diagnosis_answers.session_id
      and (s.user_id is null or s.user_id = auth.uid())
  )
);

create policy "member can view own answers"
on public.diagnosis_answers
for select
to authenticated
using (
  exists (
    select 1 from public.diagnosis_sessions s
    where s.session_id = diagnosis_answers.session_id
      and s.user_id = auth.uid()
  )
);

create policy "admin can view all answers"
on public.diagnosis_answers
for select
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 4. diagnosis_results — one row per completed session, written once the
--    diagnosis is finished. Score columns mirror the requested schema;
--    columns the current scoring algorithm does not produce yet
--    (hydration/barrier/acne/tone, top_concern_1-3) are left null rather
--    than guessed at, since the scoring logic itself is out of scope for
--    this change. skin_type_16/skin_type_64 and heat_score are kept as
--    extra columns beyond the requested list so no currently-computed axis
--    is lost.
-- ----------------------------------------------------------------------------
create table if not exists public.diagnosis_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique not null references public.diagnosis_sessions(session_id) on delete cascade,
  user_id uuid references auth.users(id),

  oil_score numeric,
  hydration_score numeric,
  sensitivity_score numeric,
  barrier_score numeric,
  acne_score numeric,
  pigmentation_score numeric,
  aging_score numeric,
  pore_score numeric,
  tone_score numeric,
  heat_score numeric,

  skin_type text,
  skin_type_16 text,
  skin_type_64 text,

  top_concern_1 text,
  top_concern_2 text,
  top_concern_3 text,

  result_version text,
  created_at timestamptz not null default now()
);

create index if not exists idx_diagnosis_results_user_id on public.diagnosis_results (user_id);
create index if not exists idx_diagnosis_results_created_at on public.diagnosis_results (created_at desc);

alter table public.diagnosis_results enable row level security;

create policy "write result into own or unclaimed session"
on public.diagnosis_results
for insert
to anon, authenticated
with check (
  (user_id is null or user_id = auth.uid())
  and exists (
    select 1 from public.diagnosis_sessions s
    where s.session_id = diagnosis_results.session_id
      and (s.user_id is null or s.user_id = auth.uid())
  )
);

-- Needed for upsert-on-retry and for backfilling user_id at sign-up time.
create policy "update own or unclaimed result"
on public.diagnosis_results
for update
to anon, authenticated
using (user_id is null or user_id = auth.uid())
with check (user_id is null or user_id = auth.uid());

create policy "member can view own results"
on public.diagnosis_results
for select
to authenticated
using (user_id = auth.uid());

create policy "admin can view all results"
on public.diagnosis_results
for select
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- Analysis helper views — read-only aggregates for the counts described in
-- the project brief (total sessions, unique visitors, unique members, each
-- member's latest completed diagnosis). No data is deleted or de-duplicated
-- at write time; de-duplication only happens here, at query time. Restricted
-- to admins the same way the base tables are.
-- ----------------------------------------------------------------------------
-- security_invoker makes each view run with the *querying* user's own RLS
-- permissions on diagnosis_sessions/diagnosis_results (Postgres 15+; Supabase
-- projects run 15+). Without it, a view runs with its owner's permissions and
-- would leak every row to any authenticated caller regardless of the "admin
-- can view all ..." policies above.
create or replace view public.diagnosis_funnel_stats
with (security_invoker = true) as
select
  count(*) as total_sessions,
  count(*) filter (where status = 'completed') as completed_sessions,
  count(distinct visitor_id) as unique_visitors,
  count(distinct user_id) filter (where user_id is not null) as unique_members
from public.diagnosis_sessions;

create or replace view public.member_latest_completed_diagnosis
with (security_invoker = true) as
select distinct on (r.user_id)
  r.user_id,
  r.session_id,
  r.skin_type,
  r.created_at
from public.diagnosis_results r
where r.user_id is not null
order by r.user_id, r.created_at desc;

revoke all on public.diagnosis_funnel_stats from anon, authenticated;
revoke all on public.member_latest_completed_diagnosis from anon, authenticated;
grant select on public.diagnosis_funnel_stats to authenticated;
grant select on public.member_latest_completed_diagnosis to authenticated;

-- With security_invoker in place, a non-admin authenticated caller can only
-- see the rows their own RLS policies already expose (their own sessions —
-- i.e. member_latest_completed_diagnosis shows only their own row, and
-- diagnosis_funnel_stats' counts are computed only over rows they can see).
-- An admin, whose "admin can view all ..." policies expose every row, sees
-- the true site-wide totals.
