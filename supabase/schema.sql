-- Inifini — Supabase schema
-- Run in the Supabase SQL editor. Safe to re-run.

create extension if not exists "pgcrypto";

-- ---------- SOURCES ----------
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rss_url text not null unique,
  domain text not null,
  language text not null default 'en',
  region text not null default 'world',
  category text not null default 'world',
  trust_level int not null default 70 check (trust_level between 0 and 100),
  active boolean not null default true,
  last_fetched_at timestamptz,
  last_status text,
  created_at timestamptz not null default now()
);

-- ---------- STORIES ----------
create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  original_url text not null unique,
  source_name text not null,
  source_domain text not null,
  category text not null default 'world',
  region text not null default 'world',
  language text not null default 'en',
  published_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  image_url text,
  original_excerpt text not null default '',
  ai_short_summary text not null default '',
  ai_medium_summary text not null default '',
  ai_why_it_matters text not null default '',
  ai_key_points jsonb not null default '[]'::jsonb,
  ai_background text not null default '',
  ai_what_next text not null default '',
  importance_score int not null default 50 check (importance_score between 0 and 100),
  novelty_score int not null default 50 check (novelty_score between 0 and 100),
  relevance_score int not null default 50 check (relevance_score between 0 and 100),
  status text not null default 'published' check (status in ('published','pending','hidden')),
  is_demo boolean not null default false,
  video_url text,
  video_status text not null default 'none' check (video_status in ('none','queued','ready','failed')),
  video_duration_seconds int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stories_published_at_idx on stories (published_at desc);
create index if not exists stories_category_idx on stories (category);
create unique index if not exists stories_slug_idx on stories (slug);

-- ---------- PROFILES (extends auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null default '',
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username, display_name)
  values (new.id, 'user_' || substr(new.id::text, 1, 8), '')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- INTERESTS ----------
create table if not exists user_interests (
  user_id uuid references auth.users(id) on delete cascade,
  category text not null,
  primary key (user_id, category)
);

-- ---------- FRIENDSHIPS (mutual) ----------
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  user_id_1 uuid references auth.users(id) on delete cascade,
  user_id_2 uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  unique (user_id_1, user_id_2)
);

-- ---------- SHARED STORIES ----------
create table if not exists shared_stories (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete cascade,
  from_user_id uuid references auth.users(id) on delete cascade,
  to_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

-- ---------- SAVES / LIKES ----------
create table if not exists story_saves (
  story_id uuid references stories(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);
create table if not exists story_likes (
  story_id uuid references stories(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

-- ---------- COMMENTS ----------
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);
create index if not exists comments_story_idx on comments (story_id, created_at);

create table if not exists comment_likes (
  comment_id uuid references comments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (comment_id, user_id)
);

-- ---------- ROW LEVEL SECURITY ----------
alter table stories enable row level security;
alter table sources enable row level security;
alter table profiles enable row level security;
alter table user_interests enable row level security;
alter table friendships enable row level security;
alter table shared_stories enable row level security;
alter table story_saves enable row level security;
alter table story_likes enable row level security;
alter table comments enable row level security;
alter table comment_likes enable row level security;

-- Public reads
create policy "read published stories" on stories for select using (status = 'published');
create policy "read active sources" on sources for select using (active = true);
create policy "read profiles" on profiles for select using (true);
create policy "read visible comments" on comments for select using (hidden = false);

-- Profiles: a user can edit only their own
create policy "update own profile" on profiles for update using (auth.uid() = id);

-- Interests: owner only
create policy "manage own interests" on user_interests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Friendships: visible to the two users involved; either can create/update
create policy "see own friendships" on friendships for select using (auth.uid() = user_id_1 or auth.uid() = user_id_2);
create policy "create friendship" on friendships for insert with check (auth.uid() = user_id_1);
create policy "update own friendship" on friendships for update using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- Shared stories: sender or recipient
create policy "see own shares" on shared_stories for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);
create policy "send share" on shared_stories for insert with check (auth.uid() = from_user_id);
create policy "mark share read" on shared_stories for update using (auth.uid() = to_user_id);

-- Saves / likes: owner only
create policy "manage own saves" on story_saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "manage own story likes" on story_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "manage own comment likes" on comment_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Comments: anyone signed in can post; author can edit/hide own
create policy "post comment" on comments for insert with check (auth.uid() = user_id);
create policy "edit own comment" on comments for update using (auth.uid() = user_id);
