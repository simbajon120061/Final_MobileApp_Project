-- Enable Supabase Realtime for the app's user-facing live data.
-- Row-level security still controls which changed rows each user can receive.
do $$
declare
  table_name text;
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    raise notice 'supabase_realtime publication does not exist; skipping table registration';
    return;
  end if;

  foreach table_name in array array[
    'profiles',
    'boarding_houses',
    'room_types',
    'rooms',
    'tenants',
    'staff_profiles',
    'leases',
    'utility_readings',
    'invoices',
    'payments',
    'payment_proofs',
    'room_assignment_requests',
    'complaints',
    'room_change_requests',
    'due_date_extension_requests',
    'announcements',
    'tenant_notifications'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null
      and not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
