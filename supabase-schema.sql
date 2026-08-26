
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
  source text default 'beta-web'
);

alter table public.skin_test_leads enable row level security;

create policy "anon can insert skin test leads"
on public.skin_test_leads
for insert
to anon
with check (consent = true);
