-- Allow verified Firebase ID tokens without a custom `role` claim to submit
-- and review initial room/payment setup. Supabase assigns these tokens to the
-- `anon` Postgres role; the policies below still require the Firebase issuer,
-- project audience, and a non-empty Firebase UID. A publishable-key-only
-- request has none of those claims and is denied by RLS.

create or replace function public.is_firebase_app_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    auth.jwt() ->> 'iss' = 'https://securetoken.google.com/boardinghouse-rental-mgt'
    and auth.jwt() ->> 'aud' = 'boardinghouse-rental-mgt'
    and nullif(auth.jwt() ->> 'sub', '') is not null,
    false
  );
$$;

create or replace function public.is_firebase_property_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.is_firebase_app_user()
    and auth.jwt() ->> 'app_role' in ('owner', 'landlord', 'caretaker');
$$;

grant execute on function public.is_firebase_app_user() to anon, authenticated;
grant execute on function public.is_firebase_property_staff() to anon, authenticated;

-- Existing authenticated-token policies remain usable; Firebase tokens
-- without the custom role claim match the same row checks through `anon`.
grant select, insert, update on public.room_assignment_requests to anon;

drop policy if exists initial_setup_read_own_or_staff on public.room_assignment_requests;
drop policy if exists initial_setup_tenant_create on public.room_assignment_requests;
drop policy if exists initial_setup_tenant_retry on public.room_assignment_requests;
drop policy if exists initial_setup_staff_manage on public.room_assignment_requests;

create policy initial_setup_read_own_or_staff on public.room_assignment_requests
  for select to anon, authenticated
  using (
    public.is_firebase_app_user()
    and (tenant_id = 'tenant-' || (auth.jwt() ->> 'sub') or public.is_firebase_property_staff())
  );

create policy initial_setup_tenant_create on public.room_assignment_requests
  for insert to anon, authenticated
  with check (
    public.is_firebase_app_user()
    and tenant_id = 'tenant-' || (auth.jwt() ->> 'sub')
    and id = 'assignment-' || tenant_id
    and status = 'pending'
    and payment_proof_status = 'pending'
    and initial_payment_amount > 0
    and payment_date is not null
    and payment_proof_path like tenant_id || '/%'
  );

create policy initial_setup_tenant_retry on public.room_assignment_requests
  for update to anon, authenticated
  using (
    public.is_firebase_app_user()
    and tenant_id = 'tenant-' || (auth.jwt() ->> 'sub')
    and status in ('pending', 'rejected')
  )
  with check (
    public.is_firebase_app_user()
    and tenant_id = 'tenant-' || (auth.jwt() ->> 'sub')
    and id = 'assignment-' || tenant_id
    and status = 'pending'
    and payment_proof_status = 'pending'
    and initial_payment_amount > 0
    and payment_date is not null
    and payment_proof_path like tenant_id || '/%'
  );

create policy initial_setup_staff_manage on public.room_assignment_requests
  for all to anon, authenticated
  using (public.is_firebase_property_staff())
  with check (public.is_firebase_property_staff());

grant insert, select on storage.objects to anon;

drop policy if exists initial_payment_proofs_tenant_upload on storage.objects;
drop policy if exists initial_payment_proofs_read_own_or_staff on storage.objects;

create policy initial_payment_proofs_tenant_upload on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'initial-payment-proofs'
    and public.is_firebase_app_user()
    and (storage.foldername(name))[1] = 'tenant-' || (auth.jwt() ->> 'sub')
  );

create policy initial_payment_proofs_read_own_or_staff on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'initial-payment-proofs'
    and public.is_firebase_app_user()
    and (
      (storage.foldername(name))[1] = 'tenant-' || (auth.jwt() ->> 'sub')
      or public.is_firebase_property_staff()
    )
  );

notify pgrst, 'reload schema';
