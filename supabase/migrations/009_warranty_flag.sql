-- 009: Pisano jamstvo 12 mjeseci (seller warranty flag for valuation uplift)
alter table public.listings
  add column if not exists warranty_12m boolean not null default false;
