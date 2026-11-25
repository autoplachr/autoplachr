-- AUTOPLAC.HR Initial Marketplace Schema, Triggers & Row-Level Security (RLS)
-- Compatible with Supabase Postgres + auth.users and local dual-mode fallback

create extension if not exists pgcrypto;

-- 1. PROFILES (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('private', 'dealer')) default 'private',
  account_type text check (account_type in ('private', 'dealer')) default 'private',
  email text,
  full_name text,
  dealership_name text,
  company_name text,
  oib text,
  city text,
  county text,
  phone text,
  address text,
  avatar_url text,
  subdomain text unique,
  working_hours jsonb,
  subscription_tier text check (subscription_tier in ('starter', 'pro', 'ai_partner')) default 'starter',
  xml_feed_url text,
  is_verified boolean default false,
  email_notifications boolean default true,
  price_alert_emails boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile when a user signs up via Google OAuth or Email/Password
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := case when coalesce(meta->>'role', meta->>'account_type') = 'dealer' then 'dealer' else 'private' end;
  v_full_name text := coalesce(nullif(trim(meta->>'full_name'), ''), nullif(trim(meta->>'name'), ''), split_part(coalesce(new.email, ''), '@', 1));
  v_dealer text := coalesce(nullif(trim(meta->>'dealership_name'), ''), nullif(trim(meta->>'company_name'), ''));
begin
  insert into public.profiles (
    id,
    role,
    account_type,
    email,
    full_name,
    dealership_name,
    company_name,
    oib,
    city,
    county,
    phone,
    address,
    avatar_url,
    subscription_tier,
    is_verified
  )
  values (
    new.id,
    v_role,
    v_role,
    new.email,
    v_full_name,
    v_dealer,
    v_dealer,
    nullif(trim(meta->>'oib'), ''),
    nullif(trim(meta->>'city'), ''),
    nullif(trim(meta->>'county'), ''),
    nullif(trim(meta->>'phone'), ''),
    nullif(trim(meta->>'address'), ''),
    nullif(trim(meta->>'avatar_url'), ''),
    coalesce(nullif(trim(meta->>'subscription_tier'), ''), 'starter'),
    coalesce((meta->>'is_verified')::boolean, new.email_confirmed_at is not null)
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        dealership_name = coalesce(public.profiles.dealership_name, excluded.dealership_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. LISTINGS
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  status text check (status in ('active', 'paused', 'sold', 'draft')) default 'active',
  make text not null,
  model text not null,
  generation text,
  trim text,
  title text not null,
  body_style text,
  year int not null,
  month int default 6,
  mileage int not null default 0,
  fuel text not null,
  transmission text not null,
  drivetrain text default 'Prednji',
  power_kw int not null default 0,
  engine_cc int default 0,
  cylinders int default 4,
  co2 int default 0,
  color text,
  color_finish text default 'Metalik',
  vin text,
  previous_price_eur int,
  price_eur int not null,
  vat_deductible boolean default false,
  on_buyer_name boolean default false,
  cvh_verified boolean default false,
  first_owner boolean default false,
  service_book boolean default false,
  in_transit boolean default false,
  city text not null,
  county text,
  description text,
  equipment jsonb default '[]'::jsonb,
  images text[] default '{}'::text[],
  views_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists listings_owner_id_idx on public.listings (owner_id);
create index if not exists listings_user_id_idx on public.listings (user_id);
create index if not exists listings_status_created_idx on public.listings (status, created_at desc);

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- 3. SAVED_LISTINGS (and compatibility view/synonym for favorites)
create table if not exists public.saved_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id text not null,
  saved_price_eur int not null default 0,
  price_alert boolean default true,
  created_at timestamptz default now(),
  unique (user_id, listing_id)
);

create index if not exists saved_listings_user_id_idx on public.saved_listings (user_id);

-- 4. MESSAGES (Supports direct listing inquiries & threaded conversations)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  listing_id text,
  sender_id uuid references public.profiles(id) on delete set null,
  recipient_id uuid references public.profiles(id) on delete set null,
  sender_name text,
  sender_phone text,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists messages_listing_id_idx on public.messages (listing_id, created_at asc);
create index if not exists messages_recipient_id_idx on public.messages (recipient_id, is_read);
create index if not exists messages_sender_id_idx on public.messages (sender_id);

-- 5. ROW-LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.saved_listings enable row level security;
alter table public.messages enable row level security;

-- Profiles RLS
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_owner_insert" on public.profiles;
create policy "profiles_owner_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Listings RLS
drop policy if exists "listings_public_or_owner_select" on public.listings;
create policy "listings_public_or_owner_select"
  on public.listings for select
  using (status = 'active' or auth.uid() = owner_id or auth.uid() = user_id);

drop policy if exists "listings_owner_insert" on public.listings;
create policy "listings_owner_insert"
  on public.listings for insert
  with check (auth.uid() = coalesce(owner_id, user_id));

drop policy if exists "listings_owner_update" on public.listings;
create policy "listings_owner_update"
  on public.listings for update
  using (auth.uid() = coalesce(owner_id, user_id))
  with check (auth.uid() = coalesce(owner_id, user_id));

drop policy if exists "listings_owner_delete" on public.listings;
create policy "listings_owner_delete"
  on public.listings for delete
  using (auth.uid() = coalesce(owner_id, user_id));

-- Saved Listings RLS
drop policy if exists "saved_listings_owner_all" on public.saved_listings;
create policy "saved_listings_owner_all"
  on public.saved_listings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Messages RLS
drop policy if exists "messages_participants_select" on public.messages;
create policy "messages_participants_select"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "messages_sender_insert" on public.messages;
create policy "messages_sender_insert"
  on public.messages for insert
  with check (auth.uid() = sender_id);

drop policy if exists "messages_recipient_update_read" on public.messages;
create policy "messages_recipient_update_read"
  on public.messages for update
  using (auth.uid() = recipient_id or auth.uid() = sender_id);


-- AUTOPLAC.HR Core Schema, Triggers, RLS Policies, Storage & Realtime
-- Execute via Supabase SQL Editor or Supabase MCP

create extension if not exists pgcrypto;

-- 1. PROFILES (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  account_type text check (account_type in ('private', 'dealer')) default 'private',
  city text,
  county text,
  company_name text,
  oib text,
  address text,
  working_hours jsonb,
  subdomain text unique,
  is_verified boolean default false,
  email_notifications boolean default true,
  price_alert_emails boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile when a user signs up via Google OAuth or Email/Password
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_account_type text := case when meta->>'account_type' = 'dealer' then 'dealer' else 'private' end;
  v_full_name text := coalesce(nullif(trim(meta->>'full_name'), ''), nullif(trim(meta->>'name'), ''), split_part(coalesce(new.email, ''), '@', 1));
  v_company text := nullif(trim(meta->>'company_name'), '');
  v_subdomain text := nullif(trim(meta->>'subdomain'), '');
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    avatar_url,
    account_type,
    city,
    county,
    company_name,
    oib,
    address,
    working_hours,
    subdomain,
    is_verified,
    email_notifications,
    price_alert_emails
  )
  values (
    new.id,
    new.email,
    v_full_name,
    nullif(trim(meta->>'phone'), ''),
    nullif(trim(meta->>'avatar_url'), ''),
    v_account_type,
    nullif(trim(meta->>'city'), ''),
    nullif(trim(meta->>'county'), ''),
    v_company,
    nullif(trim(meta->>'oib'), ''),
    nullif(trim(meta->>'address'), ''),
    meta->'working_hours',
    v_subdomain,
    coalesce((meta->>'is_verified')::boolean, false),
    coalesce((meta->>'email_notifications')::boolean, true),
    coalesce((meta->>'price_alert_emails')::boolean, true)
  )
  on conflict (id) do update
  set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. LISTINGS
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text check (status in ('active', 'paused', 'sold', 'draft')) default 'active',
  is_featured boolean default false,
  views_count int default 0,
  make text not null,
  model text not null,
  generation text,
  trim text,
  title text not null,
  body_style text,
  year int,
  month int,
  mileage int,
  fuel text,
  transmission text,
  drivetrain text,
  power_kw int,
  engine_cc int,
  co2 int,
  color text,
  price_eur int not null,
  vat_deductible boolean default false,
  on_buyer_name boolean default false,
  cvh_verified boolean default false,
  first_owner boolean default false,
  service_book boolean default false,
  in_transit boolean default false,
  city text,
  county text,
  description text,
  equipment jsonb default '[]'::jsonb,
  images jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_listings_user_id on public.listings(user_id);
create index if not exists idx_listings_status_created on public.listings(status, created_at desc);

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- 3. FAVORITES
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id text not null,
  saved_price_eur int,
  price_alert boolean default true,
  created_at timestamptz default now(),
  unique(user_id, vehicle_id)
);

create index if not exists idx_favorites_user_id on public.favorites(user_id);

-- 4. CONVERSATIONS & MESSAGES (Buyer <-> Seller Chat)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  vehicle_id text not null,
  vehicle_title text not null,
  vehicle_price_eur int,
  vehicle_image text,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(vehicle_id, buyer_id, seller_id)
);

create index if not exists idx_conversations_buyer on public.conversations(buyer_id, last_message_at desc);
create index if not exists idx_conversations_seller on public.conversations(seller_id, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at asc);

create or replace function public.bump_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_inserted on public.messages;
create trigger on_message_inserted
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

-- 5. STRICT ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Profiles RLS
drop policy if exists "Public can view dealer profiles or own profile" on public.profiles;
create policy "Public can view dealer profiles or own profile"
  on public.profiles for select
  using (account_type = 'dealer' or auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Listings RLS
drop policy if exists "Public can view active listings or own listings" on public.listings;
create policy "Public can view active listings or own listings"
  on public.listings for select
  using (status = 'active' or auth.uid() = user_id);

drop policy if exists "Users can insert own listings" on public.listings;
create policy "Users can insert own listings"
  on public.listings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own listings" on public.listings;
create policy "Users can update own listings"
  on public.listings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own listings" on public.listings;
create policy "Users can delete own listings"
  on public.listings for delete
  using (auth.uid() = user_id);

-- Favorites RLS
drop policy if exists "Users manage own favorites" on public.favorites;
create policy "Users manage own favorites"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Conversations RLS
drop policy if exists "Participants can view their conversations" on public.conversations;
create policy "Participants can view their conversations"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Authenticated buyers can create conversations" on public.conversations;
create policy "Authenticated buyers can create conversations"
  on public.conversations for insert
  with check (auth.uid() = buyer_id);

drop policy if exists "Participants can update conversation timestamps" on public.conversations;
create policy "Participants can update conversation timestamps"
  on public.conversations for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Messages RLS
drop policy if exists "Participants can view conversation messages" on public.messages;
create policy "Participants can view conversation messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "Participants can mark messages read" on public.messages;
create policy "Participants can mark messages read"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- 6. STORAGE BUCKET & POLICIES
insert into storage.buckets (id, name, public)
values ('vehicle-images', 'vehicle-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read access for vehicle-images" on storage.objects;
create policy "Public read access for vehicle-images"
  on storage.objects for select
  using (bucket_id = 'vehicle-images');

drop policy if exists "Authenticated users can upload vehicle-images" on storage.objects;
create policy "Authenticated users can upload vehicle-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'vehicle-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own vehicle-images" on storage.objects;
create policy "Users can update own vehicle-images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'vehicle-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own vehicle-images" on storage.objects;
create policy "Users can delete own vehicle-images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'vehicle-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- 7. REALTIME PUBLICATION
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;
