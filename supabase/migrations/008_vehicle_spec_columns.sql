-- Persist extracted doors/seats/ownership on listings so detail pages stop showing "Nije navedeno".
alter table public.listings add column if not exists doors integer;
alter table public.listings add column if not exists seats integer;
alter table public.listings add column if not exists ownership text;
