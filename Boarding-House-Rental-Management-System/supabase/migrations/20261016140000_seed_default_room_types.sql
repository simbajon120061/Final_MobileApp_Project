-- Keep the Supabase room picker aligned with the app's demo seed choices.
-- Safe to apply more than once; existing room types are left unchanged.
insert into public.room_types (id, name, base_rent, max_capacity, description)
values
  ('type-single', 'Single Occupancy', 2500, 1, 'Private room with single bed and study desk'),
  ('type-double', 'Double Occupancy', 3500, 2, 'Shared room with bunk beds and shared closet')
on conflict (id) do nothing;

notify pgrst, 'reload schema';
