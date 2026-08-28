-- ============================================================================
-- Anonymous diagnosis tracking + member skin-change history (v2)
-- ============================================================================
-- Additive migration. Does NOT touch skin_test_leads / skin_diagnoses from
-- supabase-schema.sql — those stay exactly as they are. This file adds new
-- tables for the "anonymous visitor -> diagnosis session -> per-question
-- answers -> result -> (optional) linked member account" flow.
--
-- Run this in the Supabase SQL editor after supabase-schema.sql.
--
-- REQUIRED one-time dashboard setting: Authentication > Sign In / Providers
-- > Anonymous > enable "Allow anonymous sign-ins". See the "v2 security
-- rewrite" note below for why.
--
-- If you already ran the v1 version of this file (visitor_id was a
-- client-generated random UUID, and diagnosis_sessions/diagnosis_results
-- allowed writes to any row with user_id IS NULL), drop the four tables
-- and re-run this file — v1 had no real users yet, so there is nothing to
-- migrate:
--   drop table if exists public.diagnosis_results;
--   drop table if exists public.diagnosis_answers;
--   drop table if exists public.diagnosis_sessions;
--   drop table if exists public.visitors;
-- ============================================================================

-- ----------------------------------------------------------------------------
-- v2 security rewrite — why visitor_id is now auth.uid()
-- ----------------------------------------------------------------------------
-- v1 let the browser invent its own visitor_id (crypto.randomUUID(), kept in
-- localStorage) and RLS allowed any anon request to write into any session
-- with user_id IS NULL. That is NOT scoped to "your own session": RLS has no
-- way to verify a client-asserted visitor_id, so literally any anonymous
-- request that knew (or found leaked, e.g. in a referrer header or log) a
-- session_id could edit that session's progress/answers/result — v1's
-- "unclaimed" write policies could not actually tell two different visitors
-- apart.
--
-- Fix: every visitor — anonymous or signed up — now gets a real Supabase
-- Auth identity via supabase.auth.signInAnonymously(), established the first
-- time the app loads in that browser and persisted the same way a normal
-- login session is. That identity's auth.uid() is cryptographically verified
-- by PostgREST from the request's JWT; a client cannot forge someone else's.
-- visitor_id is now literally that auth.uid() (references auth.users(id)),
-- and every RLS policy below checks the row's visitor_id against auth.uid()
-- directly — no more "or user_id is null" branch, no more anon-role grants.
-- An anonymous visitor is a `role = authenticated` request with
-- `is_anonymous = true` on its JWT (Supabase's documented behavior for
-- anonymous sign-ins), so `to authenticated` policies already cover both
-- anonymous and signed-up callers; a bare `anon` role request (no session at
-- all) gets zero access to any of these four tables.
--
-- Signing up later (supabase.auth.updateUser({ email, password }) while the
-- anonymous session is active — see src/auth.jsx's convertAnonymousToMember)
-- converts that SAME auth.users row from anonymous to permanent: auth.uid()
-- never changes. So every diagnosis_sessions/diagnosis_answers/
-- diagnosis_results row already carries the right owner from the moment it
-- was created — nothing needs to be reassigned across an identity boundary
-- (which RLS could not safely allow anyway). The only extra step is filling
-- in the nullable `user_id` "is this a real member" marker column (see
-- markVisitorAsMember() in src/diagnosisTracking.js) — that update is itself
-- RLS-safe because it only ever touches rows where visitor_id already equals
-- the caller's own auth.uid().
--
-- Logging into a *different*, pre-existing account replaces the session
-- (auth.uid() actually changes), so that older browser's anonymous rows
-- correctly stop being reachable by the new identity — RLS has no unsafe
-- backdoor for reassigning ownership across identities. See
-- replayCurrentDiagnosisForNewIdentity() in src/diagnosisTracking.js for how
-- the app still saves the diagnosis just taken in that case (as a fresh row
-- owned by the new identity from the start, not a reassignment).
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 0. admins — minimal allow-list used by every "admin can view all ..."
--    policy below. Created first since those policies reference it. No
--    signup flow adds rows here; add the project owner's own auth.users id
--    manually after they've signed up (with a real, non-anonymous account),
--    e.g.:
--      insert into public.admins (user_id) values ('<their auth.users id>');
-- ----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id)
);

alter table public.admins enable row level security;
-- No policies are created for admins itself: PostgREST clients get zero
-- access to this table by default once RLS is enabled with no matching
-- policy, which is exactly what we want — it's managed only from the
-- Supabase SQL editor / dashboard.

-- is_admin() is SECURITY DEFINER so it can check membership in `admins`
-- while bypassing that table's own RLS (which intentionally has no SELECT
-- policy for anyone). Without this, an "admin can view all ..." policy's
-- EXISTS subquery against admins would itself be subject to admins' RLS for
-- the querying role and always evaluate to false — even for a real admin —
-- since there's no policy granting them read access to admins directly.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ----------------------------------------------------------------------------
-- 1. visitors — pre-login anonymous identity.
--    visitor_id is auth.uid() of a Supabase Anonymous Auth session
--    (established client-side the first time the app loads, persisted the
--    same way a normal login session is). No fingerprinting: device_type is
--    a coarse mobile/tablet/desktop bucket derived from the user agent, not
--    the raw user agent string itself, and nothing else about the device is
--    stored.
-- ----------------------------------------------------------------------------
create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid unique not null references auth.users(id),
  created_at timestamptz not null default now(),
  first_source text,
  first_campaign text,
  device_type text check (device_type in ('mobile', 'tablet', 'desktop', 'unknown'))
);

create index if not exists idx_visitors_visitor_id on public.visitors (visitor_id);

alter table public.visitors enable row level security;

-- A visitor may only ever create the row for their own (real, JWT-verified)
-- identity — write-only from the browser, no read/update/delete surface.
create policy "visitor can insert own visitor row"
on public.visitors
for insert
to authenticated
with check (visitor_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. diagnosis_sessions — one row per diagnosis attempt (QUICK or DEEP).
--    A new session_id is created every time a diagnosis is (re)started.
--    visitor_id is the owning identity (see security note above) and is set
--    once at creation and never changes. user_id is a separate, nullable
--    "this is a real member, not just an anonymous session" marker, filled
--    in once the visitor signs up (see markVisitorAsMember in
--    src/diagnosisTracking.js) — it exists for MY SKIN HISTORY / analytics
--    display, not for access control.
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

-- Every write (insert or update) is scoped to visitor_id = auth.uid() — the
-- caller's own, cryptographically verified identity — full stop. user_id
-- may only ever be set to null or to that same auth.uid(), never to anyone
-- else's, so a caller can mark their own session as belonging to "a real
-- member" but can never claim another visitor's session.
create policy "own visitor can create diagnosis session"
on public.diagnosis_sessions
for insert
to authenticated
with check (
  visitor_id = auth.uid()
  and (user_id is null or user_id = auth.uid())
);

create policy "own visitor can update diagnosis session"
on public.diagnosis_sessions
for update
to authenticated
using (visitor_id = auth.uid())
with check (
  visitor_id = auth.uid()
  and (user_id is null or user_id = auth.uid())
);

-- Keyed on visitor_id (the true, always-correct ownership column), not the
-- nullable user_id marker — a session created a moment before
-- markVisitorAsMember ran its backfill is still the caller's own row and
-- should stay visible to them.
create policy "owner can view own diagnosis sessions"
on public.diagnosis_sessions
for select
to authenticated
using (visitor_id = auth.uid());

create policy "admin can view all diagnosis sessions"
on public.diagnosis_sessions
for select
to authenticated
using (public.is_admin());

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

-- Answers can only be written into a session whose visitor_id is the
-- caller's own auth.uid() — same ownership rule as diagnosis_sessions
-- itself, checked through the parent row.
create policy "own visitor can write answers"
on public.diagnosis_answers
for insert
to authenticated
with check (
  exists (
    select 1 from public.diagnosis_sessions s
    where s.session_id = diagnosis_answers.session_id
      and s.visitor_id = auth.uid()
  )
);

create policy "own visitor can update answers"
on public.diagnosis_answers
for update
to authenticated
using (
  exists (
    select 1 from public.diagnosis_sessions s
    where s.session_id = diagnosis_answers.session_id
      and s.visitor_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.diagnosis_sessions s
    where s.session_id = diagnosis_answers.session_id
      and s.visitor_id = auth.uid()
  )
);

create policy "owner can view own answers"
on public.diagnosis_answers
for select
to authenticated
using (
  exists (
    select 1 from public.diagnosis_sessions s
    where s.session_id = diagnosis_answers.session_id
      and s.visitor_id = auth.uid()
  )
);

create policy "admin can view all answers"
on public.diagnosis_answers
for select
to authenticated
using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. diagnosis_results — one row per completed session, written once the
--    diagnosis is finished. Score columns mirror the requested schema;
--    columns the current scoring algorithm does not produce yet
--    (hydration/barrier/acne/tone, top_concern_1-3) are left null rather
--    than guessed at, since the scoring logic itself is out of scope for
--    this change — they stay null until a new scoring algorithm is wired
--    up to fill them. skin_type_16/skin_type_64 and heat_score are kept as
--    extra columns beyond the requested list so no currently-computed axis
--    is lost. user_id is the same nullable "real member" marker as on
--    diagnosis_sessions, not an access-control column — ownership for
--    writes is enforced through the parent session's visitor_id (below).
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

create policy "own visitor can write result"
on public.diagnosis_results
for insert
to authenticated
with check (
  (user_id is null or user_id = auth.uid())
  and exists (
    select 1 from public.diagnosis_sessions s
    where s.session_id = diagnosis_results.session_id
      and s.visitor_id = auth.uid()
  )
);

-- Needed for upsert-on-retry and for backfilling the user_id "real member"
-- marker at sign-up time (markVisitorAsMember in src/diagnosisTracking.js).
create policy "own visitor can update result"
on public.diagnosis_results
for update
to authenticated
using (
  exists (
    select 1 from public.diagnosis_sessions s
    where s.session_id = diagnosis_results.session_id
      and s.visitor_id = auth.uid()
  )
)
with check (
  (user_id is null or user_id = auth.uid())
  and exists (
    select 1 from public.diagnosis_sessions s
    where s.session_id = diagnosis_results.session_id
      and s.visitor_id = auth.uid()
  )
);

create policy "owner can view own results"
on public.diagnosis_results
for select
to authenticated
using (
  exists (
    select 1 from public.diagnosis_sessions s
    where s.session_id = diagnosis_results.session_id
      and s.visitor_id = auth.uid()
  )
);

create policy "admin can view all results"
on public.diagnosis_results
for select
to authenticated
using (public.is_admin());

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

-- ----------------------------------------------------------------------------
-- 5. Anonymous -> existing member handoff (claim-token RPC)
-- ----------------------------------------------------------------------------
-- Scope: this section only covers "익명 진단 → 기존 회원 로그인" — signing
-- INTO a different, pre-existing account, where auth.uid() changes. It does
-- NOT touch "회원가입" (converting the current anonymous session via
-- supabase.auth.updateUser({email,password}) — see convertAnonymousToMember
-- in src/auth.jsx): that path keeps the same auth.uid() throughout, so
-- markVisitorAsMember() in src/diagnosisTracking.js (unchanged) already
-- handles it with a plain, ordinary-RLS-scoped UPDATE.
--
-- Why a plain client-side UPDATE cannot do the login case: by the time the
-- client is authenticated as the new (real) account, auth.uid() has already
-- changed — every RLS policy above is keyed on
-- `visitor_id/session.visitor_id = auth.uid()`, so a session still owned by
-- the OLD anonymous identity is (correctly) invisible and unwritable to the
-- new one. There is no safe ordinary-RLS way to reassign ownership across
-- an identity boundary — if there were, it would just as easily let anyone
-- authenticated grab anyone else's rows by ordinary UPDATE.
--
-- The fix is a narrow, two-step, SECURITY DEFINER-backed handoff:
--   1) create_handoff_claim() — called by the CLIENT WHILE STILL the
--      anonymous session (before signInWithPassword). Reads auth.uid()
--      itself server-side (never trusts a client-supplied id — this is
--      what satisfies "원래 소유자는 auth.uid()로 검증한다"), confirms
--      that identity is genuinely anonymous and owns at least one
--      completed diagnosis, and mints a random, single-use, 10-minute
--      claim token scoped to that one identity. Returns only the token.
--   2) claim_handoff(token) — called by the client AFTER
--      signInWithPassword succeeds (now authenticated as the real,
--      pre-existing member). Looks the token up, checks it's unexpired
--      and unused, and — running as SECURITY DEFINER, deliberately
--      bypassing the ordinary per-request RLS above — reassigns every
--      COMPLETED diagnosis_sessions row (and its diagnosis_results row)
--      owned by that token's anonymous identity to the caller's own
--      auth.uid(). visitor_id is intentionally reassigned too (not just
--      the nullable user_id marker), so the ordinary "owner can view own
--      ..." policies immediately cover the transferred rows with no
--      special-casing — answers transfer implicitly along with their
--      parent session, since diagnosis_answers' own RLS is entirely
--      keyed through session.visitor_id.
--
-- Why a session_id (or even a known visitor_id/uid) alone can never be
-- enough to steal a handoff: the token is a SEPARATE, independently random
-- UUID (public.session_handoff_claims.token), never derivable from a
-- session_id or a visitor_id/uid, and is only ever returned to the one
-- browser that was, at that moment, actually authenticated as the
-- anonymous identity being handed off (step 1 cannot be called "on behalf
-- of" someone else — there is no parameter for that). A stolen/leaked
-- token IS a valid bearer credential while it lives (same trust model as
-- any password-reset or email-confirmation link) — its 10-minute expiry
-- and single-use claimed_at/claimed_by guard are what bound that exposure,
-- not secrecy of the session/visitor id. See the RLS test suite for the
-- explicit theft-attempt tests this reasoning is checked against.
create table if not exists public.session_handoff_claims (
  token uuid primary key default gen_random_uuid(),
  anonymous_visitor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  claimed_at timestamptz,
  claimed_by uuid references auth.users(id)
);

alter table public.session_handoff_claims enable row level security;
-- No policies at all, on purpose: this table is only ever touched from
-- inside the two SECURITY DEFINER functions below (same pattern as
-- `admins`). No PostgREST client — anon or authenticated — gets any direct
-- table access; there is nothing to select, insert, or update here except
-- through create_handoff_claim()/claim_handoff().

create or replace function public.create_handoff_claim()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_anonymous boolean;
  v_token uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select is_anonymous into v_is_anonymous from auth.users where id = v_uid;
  if v_is_anonymous is distinct from true then
    raise exception 'only an anonymous session can create a handoff claim';
  end if;

  if not exists (
    select 1 from public.diagnosis_sessions
    where visitor_id = v_uid and status = 'completed'
  ) then
    raise exception 'no completed diagnosis to hand off';
  end if;

  -- Housekeeping only (not a security boundary): drop this identity's own
  -- previously-unclaimed tokens before minting a new one, so a browser that
  -- opens the sign-in panel more than once doesn't accumulate stale rows.
  delete from public.session_handoff_claims
  where anonymous_visitor_id = v_uid and claimed_at is null;

  insert into public.session_handoff_claims (anonymous_visitor_id)
  values (v_uid)
  returning token into v_token;

  return v_token;
end;
$$;

revoke all on function public.create_handoff_claim() from public;
grant execute on function public.create_handoff_claim() to authenticated;

create or replace function public.claim_handoff(p_token uuid)
returns table(sessions_transferred integer, results_transferred integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_uid uuid := auth.uid();
  v_claim public.session_handoff_claims%rowtype;
  v_moved_session_ids uuid[];
  v_sessions integer := 0;
  v_results integer := 0;
begin
  if v_new_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_claim
  from public.session_handoff_claims
  where token = p_token
  for update; -- lock the row: two concurrent redemption attempts can't both succeed

  if not found then
    raise exception 'invalid handoff token';
  end if;
  if v_claim.claimed_at is not null then
    raise exception 'handoff token already used';
  end if;
  if v_claim.expires_at < now() then
    raise exception 'handoff token expired';
  end if;
  if v_claim.anonymous_visitor_id = v_new_uid then
    raise exception 'cannot hand off to the same identity';
  end if;

  update public.session_handoff_claims
  set claimed_at = now(), claimed_by = v_new_uid
  where token = p_token;

  -- visitor_id is reassigned too (see the section comment above for why) —
  -- only completed sessions still owned by the claim's anonymous identity
  -- move; anything already claimed by someone else, or not yet completed,
  -- is left untouched. The moved session_ids are captured into
  -- v_moved_session_ids so the results update below touches exactly those
  -- rows — not the caller's own pre-existing sessions, which would also
  -- match a plain `visitor_id = v_new_uid` filter after the fact and
  -- inflate results_transferred.
  with moved as (
    update public.diagnosis_sessions
    set visitor_id = v_new_uid, user_id = v_new_uid
    where visitor_id = v_claim.anonymous_visitor_id
      and status = 'completed'
    returning session_id
  )
  select array_agg(session_id), count(*) into v_moved_session_ids, v_sessions from moved;

  with moved_results as (
    update public.diagnosis_results
    set user_id = v_new_uid
    where session_id = any(v_moved_session_ids)
    returning session_id
  )
  select count(*) into v_results from moved_results;

  return query select v_sessions, v_results;
end;
$$;

revoke all on function public.claim_handoff(uuid) from public;
grant execute on function public.claim_handoff(uuid) to authenticated;
