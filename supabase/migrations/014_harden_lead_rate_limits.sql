-- Audit hardening: a caller-controlled session UUID must not be enough to
-- scrape seller phone numbers or inflate analytics. Keep anonymous contact
-- working, but cap reveals per listing across all sessions and per hour.
create or replace function public.log_listing_lead(
  listing uuid, event text, session uuid, device_kind text default null, source_origin text default null,
  name_input text default null, phone_input text default null, email_input text default null, message_input text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid; lead uuid; contact text; reveal_count integer;
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
    -- Global per-listing cap defeats session rotation.
    select count(*) into reveal_count from public.listing_leads e
      where e.listing_id = listing and e.event_type = event and e.created_at > now() - interval '1 hour';
    if reveal_count >= 60 then raise exception 'Pričekajte prije ponovnog slanja.'; end if;
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
