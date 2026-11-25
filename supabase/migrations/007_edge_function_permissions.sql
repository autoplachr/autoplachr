-- Edge Functions use the service role for trusted imports; every client-facing
-- table and Storage bucket stays behind RLS.
alter table if exists public.profiles enable row level security;
alter table if exists public.listings enable row level security;
alter table if exists public.listing_leads enable row level security;
alter table if exists public.favorites enable row level security;
alter table if exists public.conversations enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists storage.objects enable row level security;

insert into storage.buckets (id, name, public)
values ('vehicle-images', 'vehicle-images', true)
on conflict (id) do update set public = true;

-- Public can read imported images; only the service role writes via Edge Functions.
drop policy if exists "Public read access for vehicle-images" on storage.objects;
create policy "Public read access for vehicle-images"
  on storage.objects for select
  using (bucket_id = 'vehicle-images');
