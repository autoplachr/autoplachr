grant insert (doors, seats, ownership), update (doors, seats, ownership)
  on public.listings to authenticated;

alter table public.profiles add column if not exists postal_code text;
grant update (postal_code) on public.profiles to authenticated;

create or replace function public.ensure_my_profile() returns void
language sql security definer set search_path = '' as $$
  insert into public.profiles as profile (id, email, full_name, avatar_url, phone, city, postal_code, county)
  select id, email,
    coalesce(nullif(btrim(raw_user_meta_data->>'full_name'), ''), nullif(btrim(raw_user_meta_data->>'name'), ''), split_part(email, '@', 1)),
    raw_user_meta_data->>'avatar_url',
    nullif(btrim(raw_user_meta_data->>'phone'), ''),
    nullif(btrim(raw_user_meta_data->>'city'), ''),
    nullif(btrim(raw_user_meta_data->>'postal_code'), ''),
    nullif(btrim(raw_user_meta_data->>'county'), '')
  from auth.users where id = (select auth.uid())
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(profile.full_name, ''), excluded.full_name),
    phone = coalesce(nullif(profile.phone, ''), excluded.phone),
    city = coalesce(nullif(profile.city, ''), excluded.city),
    postal_code = coalesce(nullif(profile.postal_code, ''), excluded.postal_code),
    county = coalesce(nullif(profile.county, ''), excluded.county)
  where profile.email is distinct from excluded.email
    or (nullif(profile.full_name, '') is null and excluded.full_name is not null)
    or (nullif(profile.phone, '') is null and excluded.phone is not null)
    or (nullif(profile.city, '') is null and excluded.city is not null)
    or (nullif(profile.postal_code, '') is null and excluded.postal_code is not null)
    or (nullif(profile.county, '') is null and excluded.county is not null);
$$;
revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;

notify pgrst, 'reload schema';
