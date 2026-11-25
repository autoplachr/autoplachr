alter table public.listings
  add column if not exists views_count integer not null default 0,
  add column if not exists phone_clicks integer not null default 0,
  add column if not exists whatsapp_clicks integer not null default 0,
  add column if not exists messages_count integer not null default 0;

alter table public.profiles
  add column if not exists whatsapp_phone text,
  add column if not exists trial_started_at timestamptz,
  add column if not exists subscription_tier text not null default 'starter';

create table if not exists public.listing_leads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('view','phone_reveal','whatsapp','message')),
  buyer_name text,
  buyer_phone text,
  buyer_email text,
  message_text text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  device text,
  source text,
  session_key uuid not null,
  replies jsonb not null default '[]'::jsonb
);
create unique index if not exists listing_leads_session_view_idx
  on public.listing_leads (listing_id, session_key) where event_type = 'view';
create index if not exists listing_leads_seller_time_idx on public.listing_leads (seller_id, created_at desc);
alter table public.listing_leads enable row level security;
revoke all on public.listing_leads from public, anon, authenticated;
grant select (id, listing_id, seller_id, event_type, buyer_name, buyer_phone, buyer_email,
  message_text, is_read, created_at, device, source, replies) on public.listing_leads to authenticated;
drop policy if exists listing_leads_seller_read on public.listing_leads;
create policy listing_leads_seller_read on public.listing_leads for select to authenticated using (seller_id = (select auth.uid()));

create or replace function public.log_listing_lead(
  listing uuid, event text, session uuid, device_kind text default null, source_origin text default null,
  name_input text default null, phone_input text default null, email_input text default null, message_input text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid; lead uuid; contact text;
begin
  if session is null or event is null or event not in ('view','phone_reveal','whatsapp','message') then
    raise exception 'Neispravna aktivnost.';
  end if;
  select l.user_id into owner from public.listings l where l.id = listing and l.status = 'active';
  if owner is null then raise exception 'Oglas nije dostupan.'; end if;
  if event = 'message' and (
    coalesce(length(btrim(name_input)), 0) not between 1 and 70
    or coalesce(length(btrim(message_input)), 0) not between 1 and 1200
    or (coalesce(btrim(email_input), '') = '' and coalesce(btrim(phone_input), '') = '')
    or coalesce(length(email_input), 0) > 160 or coalesce(length(phone_input), 0) > 40
    or (nullif(btrim(email_input), '') is not null and email_input !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (nullif(btrim(phone_input), '') is not null and phone_input !~ '^[+0-9 ()/.-]{6,40}$')
  ) then raise exception 'Provjerite ime, kontakt i poruku.'; end if;
  if event in ('phone_reveal','whatsapp') then
    select case when event = 'whatsapp' then coalesce(nullif(p.whatsapp_phone,''), p.phone) else p.phone end
      into contact from public.profiles p where p.id = owner;
    if coalesce(contact,'') = '' then raise exception 'Broj nije dostupan.'; end if;
  end if;
  if event <> 'view' and (select count(*) from public.listing_leads e where e.seller_id = owner and e.session_key = session and e.event_type = event and e.created_at > now() - interval '1 minute') >= 12 then
    raise exception 'Pričekajte prije ponovnog slanja.';
  end if;
  insert into public.listing_leads (listing_id,seller_id,event_type,session_key,device,source,buyer_name,buyer_phone,buyer_email,message_text,is_read)
  values (listing,owner,event,session,left(device_kind,16),left(source_origin,180),
    case when event='message' then btrim(name_input) end,
    case when event='message' then nullif(btrim(phone_input),'') end,
    case when event='message' then nullif(btrim(email_input),'') end,
    case when event='message' then btrim(message_input) end,event<>'message')
  on conflict (listing_id,session_key) where event_type='view' do nothing
  returning id into lead;
  if lead is not null then
    update public.listings set
      views_count = coalesce(views_count,0) + (event = 'view')::integer,
      phone_clicks = phone_clicks + (event = 'phone_reveal')::integer,
      whatsapp_clicks = whatsapp_clicks + (event = 'whatsapp')::integer,
      messages_count = messages_count + (event = 'message')::integer
    where id = listing;
  end if;
  return jsonb_build_object('id',lead,'phone',contact);
end $$;

create or replace function public.seller_analytics() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'metrics', coalesce((select jsonb_agg(to_jsonb(m)) from (
      select listing_id as "listingId",
        count(*) filter (where event_type='view') as views,
        count(*) filter (where event_type='phone_reveal') as phone,
        count(*) filter (where event_type='whatsapp') as whatsapp,
        count(*) filter (where event_type='message') as messages
      from public.listing_leads where seller_id=(select auth.uid()) and created_at >= now()-interval '30 days'
      group by listing_id
    ) m),'[]'::jsonb),
    'activity', coalesce((select jsonb_agg(to_jsonb(e) - 'session_key' order by e.created_at desc) from (
      select * from public.listing_leads where seller_id=(select auth.uid()) and event_type in ('phone_reveal','whatsapp')
      order by created_at desc limit 25
    ) e),'[]'::jsonb),
    'inquiries', coalesce((select jsonb_agg(to_jsonb(e) - 'session_key' order by e.created_at desc) from (
      select * from public.listing_leads where seller_id=(select auth.uid()) and event_type='message'
      order by created_at desc limit 200
    ) e),'[]'::jsonb),
    'unread', (select count(*) from public.listing_leads where seller_id=(select auth.uid()) and event_type='message' and not is_read)
  );
$$;

create or replace function public.respond_to_listing_lead(lead uuid, reply text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if reply is not null and length(btrim(reply)) not between 1 and 1200 then raise exception 'Poruka nije valjana.'; end if;
  update public.listing_leads set is_read=true,
    replies=case when reply is null then replies else replies || jsonb_build_array(jsonb_build_object('text',btrim(reply),'created_at',now())) end
  where id=lead and seller_id=(select auth.uid()) and event_type='message';
  if not found then raise exception 'Upit nije dostupan.'; end if;
end $$;

create or replace function public.buyer_listing_replies(lead uuid, session uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select e.replies from public.listing_leads e where e.id=lead and e.session_key=session and e.event_type='message';
$$;

create or replace function public.select_salon_plan(tier text) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare started timestamptz;
begin
  if tier is null or tier not in ('starter','pro','ai_partner') then raise exception 'Paket nije valjan.'; end if;
  update public.profiles set subscription_tier=tier, trial_started_at=coalesce(trial_started_at,now())
    where id=(select auth.uid()) and account_type='dealer' returning trial_started_at into started;
  if not found then raise exception 'Paket je dostupan autokućama.'; end if;
  return started;
end $$;

create or replace function public.guard_salon_trial_start() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon','authenticated') then
    if tg_op = 'INSERT' and new.trial_started_at is not null then
      raise exception 'Probni rok pokrenite odabirom paketa.';
    elsif tg_op = 'UPDATE' and new.trial_started_at is distinct from old.trial_started_at then
      raise exception 'Početak probnog roka nije moguće izmijeniti.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_salon_trial_start on public.profiles;
create trigger profiles_guard_salon_trial_start before insert or update on public.profiles
  for each row execute function public.guard_salon_trial_start();

revoke all on function public.log_listing_lead(uuid,text,uuid,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.buyer_listing_replies(uuid,uuid) from public, anon, authenticated;
revoke all on function public.seller_analytics() from public, anon, authenticated;
revoke all on function public.respond_to_listing_lead(uuid,text) from public, anon, authenticated;
revoke all on function public.select_salon_plan(text) from public, anon, authenticated;
grant execute on function public.log_listing_lead(uuid,text,uuid,text,text,text,text,text,text), public.buyer_listing_replies(uuid,uuid) to anon, authenticated;
grant execute on function public.seller_analytics(), public.respond_to_listing_lead(uuid,text), public.select_salon_plan(text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='listing_leads') then
    alter publication supabase_realtime add table public.listing_leads;
  end if;
end $$;
