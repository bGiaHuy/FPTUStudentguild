-- ============================================================================
-- Supabase Setup Script for FPTU Student Guide
-- Creates tables, constraints, functions, RLS policies, and triggers.
-- IDEMPOTENT — safe to run multiple times, will not wipe existing data.
-- ============================================================================

-- 1. Create Profiles Table (Linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Articles Tables (for Information Portal)
create table if not exists public.articles (
  id serial primary key,
  title text not null,
  content text not null,
  author_id uuid references public.profiles(id),
  published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.article_tags (
  id serial primary key,
  article_id integer references public.articles(id) on delete cascade,
  tag text not null
);

-- 3. Unique Constraints for Map Tables (Prevents Duplicates)
-- Campuses: code should be unique
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campuses_code_key') THEN
        ALTER TABLE public.campuses ADD CONSTRAINT campuses_code_key UNIQUE (code);
    END IF;
END $$;

-- Buildings: campus_id + code should be unique
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'buildings_campus_id_code_key') THEN
        ALTER TABLE public.buildings ADD CONSTRAINT buildings_campus_id_code_key UNIQUE (campus_id, code);
    END IF;
END $$;

-- Floors: building_id + name should be unique
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'floors_building_id_name_key') THEN
        ALTER TABLE public.floors ADD CONSTRAINT floors_building_id_name_key UNIQUE (building_id, name);
    END IF;
END $$;

-- Rooms (Map Items): item_id should be uniquely indexed to allow safe upserts
create unique index if not exists rooms_item_id_idx on public.rooms (item_id) where item_id is not null;


-- 4. Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.campuses enable row level security;
alter table public.buildings enable row level security;
alter table public.floors enable row level security;
alter table public.rooms enable row level security;
alter table public.nodes enable row level security;
alter table public.graph_edges enable row level security;
alter table public.articles enable row level security;
alter table public.article_tags enable row level security;


-- 5. Helper Functions
-- All SECURITY DEFINER functions pin search_path to public, pg_temp
-- to prevent schema-based privilege escalation. pg_temp is last so
-- temporary objects never shadow persistent ones.

create or replace function public.is_admin()
returns boolean as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$ language sql security definer
set search_path = public, pg_temp;


-- 6. First-Admin Bootstrap
-- Problem: INSERT policy requires role = 'user', so nobody can create an
--   admin profile through the API. This SECURITY DEFINER function promotes
--   the first admin. Call from SQL Editor after first signup:
--     select public.bootstrap_admin('you@fpt.edu.vn');
-- Guard: only works when zero admins exist. Once an admin exists, they
--   promote others via the admin UPDATE policy.

create or replace function public.bootstrap_admin(target_email text)
returns void as $$
begin
  if exists(select 1 from public.profiles where role = 'admin') then
    raise exception 'Bootstrap denied: an admin already exists. Use the admin UPDATE policy instead.';
  end if;
  update public.profiles set role = 'admin' where email = target_email;
  if not found then
    raise exception 'Bootstrap failed: no profile found with email %. Sign up first, then run bootstrap.', target_email;
  end if;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;


-- 7. Role Escalation Trigger
-- Defense-in-depth: even if RLS policies are misconfigured, this BEFORE
-- UPDATE trigger rejects non-admin role changes with an explicit exception.
-- Fires only when role actually changes (WHEN clause) to avoid overhead
-- on harmless profile updates (full_name, email, etc.).

create or replace function public.prevent_role_escalation()
returns trigger as $$
begin
  if not public.is_admin() then
    raise exception 'Role escalation denied: user % attempted to change role from % to %',
      old.id, old.role, new.role;
  end if;
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

drop trigger if exists prevent_role_escalation_trigger on public.profiles;
create trigger prevent_role_escalation_trigger
  before update on public.profiles
  for each row
  when (old.role is distinct from new.role)
  execute function public.prevent_role_escalation();


-- 8. RLS Policies

-- ── PROFILES ───────────────────────────────────────────
-- SELECT: self-only for normal users, full access for admins.
--   Old broad "Public profiles are viewable by everyone." is dropped
--   because it exposed email (PII) and role to anyone, unauthenticated
--   or authenticated.

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Users can view own profile." on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Admins can view all profiles." on public.profiles;
create policy "Admins can view all profiles." on public.profiles
  for select using (public.is_admin());

-- INSERT: user can create their own row, but role MUST be 'user'.
--   handle_new_user() bypasses RLS (SECURITY DEFINER) and omits role
--   so it falls to DEFAULT 'user'. A malicious client sending
--   {role: 'admin'} is rejected by with check.

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id and role = 'user');

-- UPDATE: simple self-only using/check. Role enforcement is by the
--   BEFORE UPDATE trigger, not by policy subquery, to avoid any risk
--   of RLS recursion on public.profiles.

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admin UPDATE: admins can update any profile row (manage users,
--   change roles via dashboard support). The trigger still fires
--   but is_admin() returns true so it passes.

drop policy if exists "Admins can update all profiles." on public.profiles;
create policy "Admins can update all profiles." on public.profiles
  for update using (public.is_admin());


-- ── MAP DATA ────────────────────────────────────────────
-- Map data is a public campus resource. Read access is open.
-- Write access is limited to admins.

drop policy if exists "Allow public read on campuses" on public.campuses;
create policy "Allow public read on campuses" on public.campuses for select using (true);

drop policy if exists "Allow public read on buildings" on public.buildings;
create policy "Allow public read on buildings" on public.buildings for select using (true);

drop policy if exists "Allow public read on floors" on public.floors;
create policy "Allow public read on floors" on public.floors for select using (true);

drop policy if exists "Allow public read on rooms" on public.rooms;
create policy "Allow public read on rooms" on public.rooms for select using (true);

drop policy if exists "Allow public read on nodes" on public.nodes;
create policy "Allow public read on nodes" on public.nodes for select using (true);

drop policy if exists "Allow public read on graph_edges" on public.graph_edges;
create policy "Allow public read on graph_edges" on public.graph_edges for select using (true);

-- Admin Write Access for Map Data
drop policy if exists "Allow admin full access on campuses" on public.campuses;
create policy "Allow admin full access on campuses" on public.campuses for all using (public.is_admin());

drop policy if exists "Allow admin full access on buildings" on public.buildings;
create policy "Allow admin full access on buildings" on public.buildings for all using (public.is_admin());

drop policy if exists "Allow admin full access on floors" on public.floors;
create policy "Allow admin full access on floors" on public.floors for all using (public.is_admin());

drop policy if exists "Allow admin full access on rooms" on public.rooms;
create policy "Allow admin full access on rooms" on public.rooms for all using (public.is_admin());

drop policy if exists "Allow admin full access on nodes" on public.nodes;
create policy "Allow admin full access on nodes" on public.nodes for all using (public.is_admin());

drop policy if exists "Allow admin full access on graph_edges" on public.graph_edges;
create policy "Allow admin full access on graph_edges" on public.graph_edges for all using (public.is_admin());


-- ── ARTICLES & TAGS ─────────────────────────────────────
-- Public can read published articles only. Tags are public metadata.

drop policy if exists "Allow public read on published articles" on public.articles;
create policy "Allow public read on published articles" on public.articles for select using (published = true);

drop policy if exists "Allow public read on article_tags" on public.article_tags;
create policy "Allow public read on article_tags" on public.article_tags for select using (true);

-- Admin Full Access on Articles
drop policy if exists "Allow admin full access on articles" on public.articles;
create policy "Allow admin full access on articles" on public.articles for all using (public.is_admin());

drop policy if exists "Allow admin full access on article_tags" on public.article_tags;
create policy "Allow admin full access on article_tags" on public.article_tags for all using (public.is_admin());


-- 9. Trigger to Auto-create Profile on Signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer
set search_path = public, pg_temp;

-- Recreate trigger cleanly
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
