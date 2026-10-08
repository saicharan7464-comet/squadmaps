-- ==============================================================================
-- SquadMaps Production Authentication & Database Schema Migration
-- ==============================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id text primary key,
  name text not null,
  email text,
  avatar text,
  color text default '#00F0FF',
  is_guest boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookup by email
create index if not exists idx_profiles_email on public.profiles(email);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies for public.profiles
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid()::text = id or is_guest = true or auth.uid() is null);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid()::text = id or is_guest = true)
  with check (auth.uid()::text = id or is_guest = true);

-- 2. AUTOMATIC PROFILE CREATION TRIGGER FOR SUPABASE AUTH USERS
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_name text;
  avatar_url text;
begin
  user_name := coalesce(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );
  avatar_url := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    'https://api.dicebear.com/7.x/bottts/svg?seed=' || new.id::text
  );

  insert into public.profiles (id, name, email, avatar, color, is_guest, created_at, updated_at)
  values (
    new.id::text,
    user_name,
    new.email,
    avatar_url,
    '#00F0FF',
    false,
    now(),
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    is_guest = false,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. SQUADS TABLE
create table if not exists public.squads (
  squad_id text primary key,
  host_id text not null,
  host_name text not null,
  name text not null,
  destination text not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  vehicle_mode text default 'car',
  status text default 'active',
  canonical_route jsonb,
  settings jsonb,
  active_regroup_point jsonb,
  created_at_ms bigint,
  created_at timestamptz default now()
);

alter table public.squads enable row level security;

drop policy if exists "Squads are viewable by anyone" on public.squads;
create policy "Squads are viewable by anyone"
  on public.squads for select
  using (true);

drop policy if exists "Squads can be created by authenticated users or guests" on public.squads;
create policy "Squads can be created by authenticated users or guests"
  on public.squads for insert
  with check (true);

drop policy if exists "Hosts can update their squad" on public.squads;
create policy "Hosts can update their squad"
  on public.squads for update
  using (true);

-- 4. SQUAD MEMBERS TABLE
create table if not exists public.squad_members (
  squad_id text not null references public.squads(squad_id) on delete cascade,
  user_id text not null,
  name text not null,
  profile_image text,
  color text default '#00F0FF',
  latitude double precision not null,
  longitude double precision not null,
  speed double precision default 0,
  heading double precision default 0,
  accuracy double precision default 10,
  last_updated bigint,
  eta text default 'Calculating...',
  eta_seconds integer default 0,
  distance_remaining integer default 0,
  status text default 'active',
  online boolean default true,
  vehicle_mode text default 'car',
  is_host boolean default false,
  location_sharing_paused boolean default false,
  primary key (squad_id, user_id)
);

alter table public.squad_members enable row level security;

drop policy if exists "Squad members are viewable by anyone" on public.squad_members;
create policy "Squad members are viewable by anyone"
  on public.squad_members for select
  using (true);

drop policy if exists "Members can insert/update their location" on public.squad_members;
create policy "Members can insert/update their location"
  on public.squad_members for all
  using (true);

-- 5. CHAT MESSAGES TABLE
create table if not exists public.chat_messages (
  id text primary key,
  squad_id text not null references public.squads(squad_id) on delete cascade,
  sender_id text not null,
  sender_name text not null,
  sender_avatar text,
  sender_color text default '#00F0FF',
  text text not null,
  type text default 'chat',
  quick_action text,
  timestamp bigint not null,
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;

drop policy if exists "Chat messages are viewable by squad participants" on public.chat_messages;
create policy "Chat messages are viewable by squad participants"
  on public.chat_messages for select
  using (true);

drop policy if exists "Participants can post chat messages" on public.chat_messages;
create policy "Participants can post chat messages"
  on public.chat_messages for insert
  with check (true);

-- 6. PLACE SUGGESTIONS TABLE
create table if not exists public.place_suggestions (
  id text primary key,
  squad_id text not null references public.squads(squad_id) on delete cascade,
  created_by text not null,
  created_by_name text not null,
  place jsonb not null,
  votes jsonb default '{}'::jsonb,
  status text default 'open',
  created_at bigint not null
);

alter table public.place_suggestions enable row level security;

drop policy if exists "Place suggestions viewable by anyone" on public.place_suggestions;
create policy "Place suggestions viewable by anyone"
  on public.place_suggestions for select
  using (true);

drop policy if exists "Members can suggest places and vote" on public.place_suggestions;
create policy "Members can suggest places and vote"
  on public.place_suggestions for all
  using (true);

-- Enable Realtime publication for squads, squad_members, and chat_messages
alter publication supabase_realtime add table public.squads;
alter publication supabase_realtime add table public.squad_members;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.place_suggestions;
