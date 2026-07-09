-- Fix: "Become a Driver" failed with "Could not set up your driver profile"
--
-- Root cause: the app creates a driver via `.insert(...).select().single()`,
-- which asks PostgREST for the inserted row (INSERT ... RETURNING). Postgres
-- applies the table's SELECT policy to the RETURNING row. The old SELECT policy
-- was `is_driver_visible(id)`, whose "this is my own row" branch relies on
-- `current_driver_id()` — a subquery over `drivers` that cannot see the
-- just-inserted, not-yet-visible row during RETURNING. It therefore returned
-- false and Postgres raised 42501 ("new row violates row-level security policy"),
-- surfaced by PostgREST as HTTP 403.
--
-- The plain INSERT (WITH CHECK `user_id = auth.uid()`) was always fine; only the
-- RETURNING/representation path failed.
--
-- Fix: let an owner see their own driver row via a direct column comparison
-- (`user_id = auth.uid()`), which is evaluated against the RETURNING row itself
-- and needs no subquery. This is strictly a reliability fix of the existing
-- "see your own row" intent and does not widen visibility to anyone else.

drop policy if exists drivers_select on public.drivers;

create policy drivers_select on public.drivers
for select
using (user_id = auth.uid() or is_driver_visible(id));
