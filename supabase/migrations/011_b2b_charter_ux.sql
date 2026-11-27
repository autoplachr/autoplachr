-- 011: B2B charter UX support — seller-controlled price badge and new boost tiers.
alter table public.listings
  add column if not exists show_price_badge boolean not null default false;

create or replace function public.activate_listing_boost(listing_id uuid, tier text)
returns timestamp with time zone language plpgsql security definer set search_path to ''
as $fn$
declare
  seller_id uuid := auth.uid();
  target public.listings%rowtype;
  activated_at timestamptz := statement_timestamp();
  expires_at timestamptz;
begin
  if seller_id is null or tier is null or tier not in ('boost_72h','top_7d','bump','fast_sale') then
    raise exception 'Odaberite valjanu opciju isticanja.' using errcode = '22023';
  end if;
  select * into target from public.listings where id = listing_id and user_id = seller_id and status = 'active' for update;
  if not found then
    raise exception 'Istaknuti možete samo svoj aktivni oglas.' using errcode = '42501';
  end if;
  if target.is_boosted and (target.boost_expires_at is null or target.boost_expires_at > activated_at) then
    if target.boost_tier = tier then return target.boost_expires_at; end if;
    raise exception 'Oglas već ima aktivno isticanje.';
  end if;
  expires_at := activated_at + case tier
    when 'top_7d' then interval '168 hours'
    when 'fast_sale' then interval '168 hours'
    when 'bump' then interval '2 hours'
    else interval '72 hours' end;
  update public.listings set is_boosted = true, boost_tier = tier, boost_expires_at = expires_at where id = target.id;
  return expires_at;
end $fn$;
grant execute on function public.activate_listing_boost(uuid,text) to authenticated;
