-- Driver Inbox: let a driver see the profile of a client who has favorited
-- them, so they can chat even before any ride exists. Mirrors is_driver_visible,
-- which already lets a client see drivers they've favorited. favorites_select
-- already exposes the favorite row to the driver (driver_id = current_driver_id()).
create or replace function public.is_client_visible(c uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select c = public.current_client_id()
    or exists (
      select 1 from public.rides r
      where r.client_id = c
        and ( r.driver_id = public.current_driver_id()
           or (r.status = 'requested' and public.current_driver_id() is not null) )
    )
    or exists (
      select 1 from public.favorites f
      where f.client_id = c
        and f.driver_id = public.current_driver_id()
    )
$function$;
