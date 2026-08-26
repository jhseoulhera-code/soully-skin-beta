
create table if not exists public.skin_test_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact_method text not null check (contact_method in ('kakao', 'email')),
  contact_value text not null,
  consent boolean not null default false,
  skin16 text,
  skin64_candidate text,
  oil_score integer,
  sensitivity_score integer,
  pigmentation_score integer,
  aging_score integer,
  congestion_score integer,
  heat_score integer,
  recommend_intent text check (recommend_intent in ('very', 'interested', 'unsure', 'no')),
  recommend_methods text[],
  answers jsonb,
  skin_version text default 'v3.3',
  source text default 'beta-web'
);

-- v3.3: adds recommend_intent / recommend_methods to a table created before this change
alter table public.skin_test_leads add column if not exists recommend_intent text;
alter table public.skin_test_leads add column if not exists recommend_methods text[];

-- v3.4: raw survey answers + a version tag, so future scoring changes can be
-- told apart from older diagnoses when this table is later reviewed/queried.
-- No user/auth table exists yet, so this stays append-only and unlinked to
-- an identity — see the auth/DB review notes for the follow-up needed to
-- turn this into per-user diagnosis history.
alter table public.skin_test_leads add column if not exists answers jsonb;
alter table public.skin_test_leads add column if not exists skin_version text default 'v3.3';

alter table public.skin_test_leads enable row level security;

create policy "anon can insert skin test leads"
on public.skin_test_leads
for insert
to anon
with check (consent = true);


-- v3.5: skin_diagnoses stores EVERY completed diagnosis, not only the
-- people who leave contact info in skin_test_leads. The two tables keep
-- their separate roles:
--   skin_diagnoses  = every completed diagnosis (anonymous by default)
--   skin_test_leads = only the people who chose to leave a contact
-- skin_test_leads.diagnosis_id links a lead back to the diagnosis that
-- was on screen when they registered, when that save succeeded.
--
-- Score columns are named to match this app's actual 6 axes (see
-- src/App.jsx's AXIS map / analysis.p: OD/SR/PN/WT/CB/HQ) and reuse the
-- same oil/sensitivity/pigmentation/aging/congestion/heat_score names
-- already used in skin_test_leads above — there is no separate
-- "texture" axis in the current scoring logic, so no texture_score
-- column is created.
create table if not exists public.skin_diagnoses (
  id uuid primary key default gen_random_uuid(),

  anonymous_id uuid not null,
  user_id uuid null,

  skin_type text,
  skin64_candidate text,
  oil_score numeric,
  sensitivity_score numeric,
  pigmentation_score numeric,
  aging_score numeric,
  congestion_score numeric,
  heat_score numeric,

  answers jsonb not null default '{}'::jsonb,
  skin_version text not null default 'v1',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_skin_diagnoses_anonymous_id
on public.skin_diagnoses (anonymous_id);

create index if not exists idx_skin_diagnoses_user_id
on public.skin_diagnoses (user_id);

create index if not exists idx_skin_diagnoses_skin_type
on public.skin_diagnoses (skin_type);

create index if not exists idx_skin_diagnoses_created_at
on public.skin_diagnoses (created_at desc);

alter table public.skin_diagnoses enable row level security;

-- Anonymous (or, later, logged-in) visitors may insert their own
-- diagnosis row as soon as the result screen is computed. No public
-- select/update/delete policy is created, so rows are write-only from
-- the browser, same posture as skin_test_leads.
create policy "anon can insert skin diagnoses"
on public.skin_diagnoses
for insert
to anon
with check (true);

alter table public.skin_test_leads
  add column if not exists diagnosis_id uuid references public.skin_diagnoses(id);
