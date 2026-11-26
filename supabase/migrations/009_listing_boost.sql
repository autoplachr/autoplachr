alter table public.listings
  add column if not exists is_boosted boolean not null default false,
  add column if not exists boost_tier text not null default 'none'
    check (boost_tier in ('none', 'boost_72h', 'top_7d')),
  add column if not exists boost_expires_at timestamptz;

create or replace function public.guard_listing_boost()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.is_boosted or new.boost_tier <> 'none' or new.boost_expires_at is not null then
        raise exception 'Isticanje se aktivira zasebno.' using errcode = '42501';
      end if;
    elsif row(new.is_boosted, new.boost_tier, new.boost_expires_at)
      is distinct from row(old.is_boosted, old.boost_tier, old.boost_expires_at) then
      raise exception 'Isticanje se aktivira zasebno.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_listing_boost on public.listings;
create trigger guard_listing_boost before insert or update on public.listings
for each row execute function public.guard_listing_boost();
revoke all on function public.guard_listing_boost() from public, anon, authenticated;

create or replace function public.activate_listing_boost(listing_id uuid, tier text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  seller_id uuid := auth.uid();
  target public.listings%rowtype;
  activated_at timestamptz := statement_timestamp();
  expires_at timestamptz;
begin
  if seller_id is null or tier is null or tier not in ('boost_72h', 'top_7d') then
    raise exception 'Odaberite valjanu opciju isticanja.' using errcode = '22023';
  end if;

  select * into target from public.listings
  where id = listing_id and user_id = seller_id and status = 'active'
  for update;
  if not found then
    raise exception 'Istaknuti možete samo svoj aktivni oglas.' using errcode = '42501';
  end if;

  if target.is_boosted and (target.boost_expires_at is null or target.boost_expires_at > activated_at) then
    if target.boost_tier = tier then
      return target.boost_expires_at;
    end if;
    raise exception 'Oglas već ima aktivno isticanje.';
  end if;

  expires_at := activated_at + case tier when 'top_7d' then interval '168 hours' else interval '72 hours' end;
  update public.listings set is_boosted = true, boost_tier = tier, boost_expires_at = expires_at
  where id = target.id;
  return expires_at;
end $$;

revoke all on function public.activate_listing_boost(uuid, text) from public, anon, authenticated;
grant execute on function public.activate_listing_boost(uuid, text) to authenticated;
notify pgrst, 'reload schema';
