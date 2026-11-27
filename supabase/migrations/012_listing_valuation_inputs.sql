alter table public.listings
  add column if not exists show_price_badge boolean not null default false,
  add column if not exists value_proofs text[],
  add column if not exists variant text,
  add column if not exists make_equipment text[];
grant insert (show_price_badge, value_proofs, variant, make_equipment),
  update (show_price_badge, value_proofs, variant, make_equipment)
  on public.listings to authenticated;
notify pgrst, 'reload schema';
