-- Keep personal profile fields behind ownership checks. Public listings expose selected seller fields.
drop policy if exists "Public can view dealer profiles or own profile" on public.profiles;
drop policy if exists "profiles_public_read" on public.profiles;
create policy profiles_owner_read on public.profiles for select using ((select auth.uid()) = id);

drop policy if exists listings_owner_insert on public.listings;
drop policy if exists listings_owner_update on public.listings;
drop policy if exists listings_owner_delete on public.listings;
drop policy if exists listings_public_or_owner_select on public.listings;
alter table public.listings alter column user_id set not null;
alter table public.listings add constraint listings_owner_matches_user check (owner_id is null or owner_id = user_id);

revoke insert, update on public.profiles from anon, authenticated;
grant update (full_name, company_name, dealership_name, subdomain, phone, city, county, oib, address,
  xml_feed_url, whatsapp_phone, working_hours, email_notifications, price_alert_emails) on public.profiles to authenticated;

alter table public.messages add constraint messages_conversation_id_fkey
  foreign key (conversation_id) references public.conversations(id) on delete cascade;
drop policy if exists messages_sender_insert on public.messages;
drop policy if exists messages_participants_select on public.messages;
drop policy if exists messages_recipient_update_read on public.messages;
drop policy if exists "Participants can update conversation timestamps" on public.conversations;
drop policy if exists "Participants can mark messages read" on public.messages;
create policy messages_mark_read on public.messages for update to authenticated using (
  auth.uid() <> sender_id and exists (
    select 1 from public.conversations c where c.id = conversation_id
      and auth.uid() in (c.buyer_id, c.seller_id)
  )
);
revoke update on public.messages from authenticated;
grant update (is_read) on public.messages to authenticated;

create or replace function public.ensure_my_profile() returns void
language sql security definer set search_path = '' as $$
  insert into public.profiles (id, email, full_name, avatar_url)
  select id, email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email,'@',1)), raw_user_meta_data->>'avatar_url'
  from auth.users where id = (select auth.uid())
  on conflict (id) do update set email = excluded.email
    where public.profiles.email is distinct from excluded.email;
$$;
revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;

create or replace function public.public_listing_sellers(listing_ids uuid[]) returns table (
  listing_id uuid, full_name text, company_name text, account_type text, address text,
  working_hours jsonb, is_verified boolean, contact_available boolean
) language sql stable security definer set search_path = '' as $$
  select l.id, case when p.account_type = 'dealer' then p.full_name else split_part(p.full_name, ' ', 1) end,
    case when p.account_type = 'dealer' then coalesce(p.dealership_name, p.company_name) end, p.account_type,
    case when p.account_type = 'dealer' then p.address end,
    case when p.account_type = 'dealer' then p.working_hours end,
    p.is_verified, nullif(p.phone,'') is not null or nullif(p.whatsapp_phone,'') is not null
  from public.listings l join public.profiles p on p.id = l.user_id
  where l.status = 'active' and l.id = any(listing_ids);
$$;
revoke all on function public.public_listing_sellers(uuid[]) from public;
grant execute on function public.public_listing_sellers(uuid[]) to anon, authenticated;

update storage.buckets set public = true where id = 'vehicle-images';

-- Apply only metadata collected during signup. Verification is managed separately.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  kind text := case when meta->>'account_type' = 'dealer' then 'dealer' else 'private' end;
  company text := case when kind = 'dealer' then nullif(left(btrim(meta->>'company_name'),100),'') end;
  requested_slug text := case when kind = 'dealer' then nullif(left(regexp_replace(lower(meta->>'subdomain'),'[^a-z0-9-]','','g'),48),'') end;
begin
  insert into public.profiles (
    id, email, full_name, avatar_url, role, account_type, dealership_name, company_name,
    oib, phone, city, county, address, working_hours, subdomain, price_alert_emails
  ) values (
    new.id, new.email, left(coalesce(nullif(btrim(meta->>'full_name'), ''), nullif(btrim(meta->>'name'), ''), split_part(coalesce(new.email,''),'@',1)),100),
    left(meta->>'avatar_url',500), kind, kind, company, company,
    case when kind = 'dealer' and meta->>'oib' ~ '^[0-9]{11}$' then meta->>'oib' end,
    left(meta->>'phone',40), left(meta->>'city',100), left(meta->>'county',100),
    case when kind = 'dealer' then left(meta->>'address',240) end,
    case when kind = 'dealer' then meta->'working_hours' end,
    case when requested_slug is not null then requested_slug || '-' || left(new.id::text,8) end,
    coalesce(meta->'price_alert_emails' <> 'false'::jsonb, true)
  ) on conflict (id) do nothing;
  return new;
end $$;

insert into public.profiles (id,email,full_name,avatar_url)
select id,email,coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',split_part(email,'@',1)),raw_user_meta_data->>'avatar_url'
from auth.users on conflict (id) do nothing;

