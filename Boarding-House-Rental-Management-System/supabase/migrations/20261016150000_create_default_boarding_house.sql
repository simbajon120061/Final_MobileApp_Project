-- Create a minimal property record for a fresh Supabase project so rooms have
-- a valid house_id. Existing property records are preserved.
insert into public.boarding_houses (id, name, address, default_kwh_rate, created_at)
select
  'bh-1',
  'Boarding House',
  '',
  12.00,
  (now() at time zone 'utc')::text
where not exists (select 1 from public.boarding_houses);

notify pgrst, 'reload schema';
