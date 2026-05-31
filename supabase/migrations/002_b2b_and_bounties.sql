-- ============================================================
-- Migration 002: B2B Organizations + Bounty Support
-- ============================================================

-- ─── Organizations ───────────────────────────────────────────
create table public.organizations (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  logo_url      text,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- Org admin can read/update their own org
create policy "orgs: admin read" on public.organizations
  for select using (auth.uid() = admin_user_id);

create policy "orgs: admin update" on public.organizations
  for update using (auth.uid() = admin_user_id);

-- Members can read their org
create policy "orgs: member read" on public.organizations
  for select using (
    id in (
      select org_id from public.profiles where user_id = auth.uid()
    )
  );

-- ─── Update Profiles: add org_id ─────────────────────────────
alter table public.profiles
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

-- ─── Update Projects: add bounty flag ────────────────────────
alter table public.projects
  add column if not exists is_bounty_submission boolean not null default false;

-- ─── Index for org member lookups ────────────────────────────
create index if not exists profiles_org_id_idx on public.profiles(org_id);
create index if not exists orgs_admin_user_id_idx on public.organizations(admin_user_id);
