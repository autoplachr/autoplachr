grant select on public.listings to anon, authenticated;
grant select on public.profiles to authenticated;
grant delete on public.listings to authenticated;
grant select, insert, update, delete on public.favorites to authenticated;
grant select on public.conversations, public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;

grant insert (id, user_id, owner_id, status, make, model, generation, trim, title, body_style,
  year, month, mileage, fuel, transmission, drivetrain, power_kw, engine_cc, co2, cylinders,
  registration_until, color, vin, previous_price_eur, price_eur, vat_deductible, on_buyer_name,
  cvh_verified, first_owner, service_book, in_transit, city, county, description, equipment, images),
update (id, user_id, owner_id, status, make, model, generation, trim, title, body_style,
  year, month, mileage, fuel, transmission, drivetrain, power_kw, engine_cc, co2, cylinders,
  registration_until, color, vin, previous_price_eur, price_eur, vat_deductible, on_buyer_name,
  cvh_verified, first_owner, service_book, in_transit, city, county, description, equipment, images)
on public.listings to authenticated;

grant all on public.profiles, public.listings, public.favorites, public.conversations, public.messages to service_role;
drop policy if exists "Authenticated buyers can create conversations" on public.conversations;

create or replace function public.open_listing_conversation(listing uuid, message_body text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare buyer uuid := (select auth.uid()); target public.listings%rowtype; conversation uuid;
begin
  if buyer is null then raise exception 'Prijavite se kako biste nastavili.'; end if;
  select * into target from public.listings where id = listing and status = 'active';
  if target.id is null or target.user_id = buyer then raise exception 'Razgovor za ovaj oglas nije dostupan.'; end if;
  insert into public.conversations (vehicle_id, vehicle_title, vehicle_price_eur, vehicle_image, buyer_id, seller_id)
  values (target.id::text, target.title, target.price_eur, target.images[1], buyer, target.user_id)
  on conflict (vehicle_id, buyer_id, seller_id) do update set vehicle_title = excluded.vehicle_title
  returning id into conversation;
  if nullif(btrim(message_body),'') is not null then
    insert into public.messages (conversation_id, sender_id, body)
    values (conversation, buyer, btrim(message_body));
  end if;
  return conversation;
end $$;
revoke all on function public.open_listing_conversation(uuid,text) from public, anon;
grant execute on function public.open_listing_conversation(uuid,text) to authenticated;

notify pgrst, 'reload schema';
