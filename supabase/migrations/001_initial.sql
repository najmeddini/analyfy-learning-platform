-- ============================================================
-- Learning Platform — Initial Schema + RLS
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────
create table public.profiles (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  role         text not null default 'user' check (role in ('user', 'admin')),
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile; admins can read all
create policy "profiles: own read" on public.profiles
  for select using (auth.uid() = user_id);

create policy "profiles: own update" on public.profiles
  for update using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── User Progress ────────────────────────────────────────────
create table public.user_progress (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  topic_id     text not null,
  lesson_id    text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

alter table public.user_progress enable row level security;

create policy "progress: own read" on public.user_progress
  for select using (auth.uid() = user_id);

create policy "progress: own insert" on public.user_progress
  for insert with check (auth.uid() = user_id);

create policy "progress: own upsert" on public.user_progress
  for update using (auth.uid() = user_id);

-- ─── Comments ────────────────────────────────────────────────
create table public.comments (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  topic_id          text not null,
  content           text not null,
  is_public_consent boolean not null default false,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at        timestamptz not null default now()
);

alter table public.comments enable row level security;

-- Users can create comments for themselves
create policy "comments: own insert" on public.comments
  for insert with check (auth.uid() = user_id);

-- Users can read their own comments
create policy "comments: own read" on public.comments
  for select using (auth.uid() = user_id);

-- Anyone can read approved public comments
create policy "comments: public approved read" on public.comments
  for select using (status = 'approved' and is_public_consent = true);

-- Admins can read/update/delete all (via service role — bypasses RLS)

-- ─── Projects ────────────────────────────────────────────────
create table public.projects (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  topic_id   text not null,
  file_url   text not null,
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects: own insert" on public.projects
  for insert with check (auth.uid() = user_id);

create policy "projects: own read" on public.projects
  for select using (auth.uid() = user_id);

-- Admins manage via service role (bypasses RLS)

-- ─── Donations ───────────────────────────────────────────────
create table public.donations (
  id         uuid primary key default uuid_generate_v4(),
  donor_name text not null,
  amount     numeric(10,0) not null check (amount > 0),
  created_at timestamptz not null default now()
);

alter table public.donations enable row level security;

-- Scoreboard is public read
create policy "donations: public read" on public.donations
  for select using (true);

-- Only service role can insert (managed externally / by admin)

-- ─── Storage: Projects Bucket ─────────────────────────────────
-- Run in Supabase dashboard or via CLI:
-- insert into storage.buckets (id, name, public) values ('projects', 'projects', false);

-- Storage RLS: users can upload to their own folder
create policy "storage: own upload" on storage.objects
  for insert with check (
    bucket_id = 'projects'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "storage: own read" on storage.objects
  for select using (
    bucket_id = 'projects'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Admins read all storage objects via service role
