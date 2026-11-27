alter table public.listings add column if not exists category text
  check (category in ('automobili', 'gospodarska', 'motocikli'));
grant insert (category), update (category) on public.listings to authenticated;
notify pgrst, 'reload schema';
