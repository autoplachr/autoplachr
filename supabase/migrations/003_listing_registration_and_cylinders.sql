alter table public.listings
  add column if not exists cylinders smallint check (cylinders between 0 and 16),
  add column if not exists registration_until text check (registration_until ~ '^(0[1-9]|1[0-2])/[0-9]{4}$');
