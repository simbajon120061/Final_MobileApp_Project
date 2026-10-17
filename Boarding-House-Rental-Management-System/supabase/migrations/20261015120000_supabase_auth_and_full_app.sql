-- Move the app fully from Firebase-issued tokens to Supabase Auth users.
-- Existing Firebase accounts are deliberately not imported.

-- Keep the current app data layer aligned with the columns it writes.
alter table public.invoices
  add column if not exists water_charge numeric(12, 2) not null default 0
    check (water_charge >= 0);

alter table public.tenant_notifications
  add column if not exists dismissed boolean not null default false;

alter table public.payments
  drop constraint if exists payments_payment_method_check;
alter table public.payments
  add constraint payments_payment_method_check
  check (payment_method in ('cash', 'gcash', 'bank_transfer'));

alter table public.payment_proofs
  drop constraint if exists payment_proofs_payment_method_check;
alter table public.payment_proofs
  add constraint payment_proofs_payment_method_check
  check (payment_method in ('cash', 'gcash', 'bank_transfer'));

create or replace function private.is_property_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('owner', 'landlord')
  );
$$;
revoke all on function private.is_property_owner() from public, anon;
grant execute on function private.is_property_owner() to authenticated;

drop policy if exists rooms_staff_manage on public.rooms;
create policy rooms_owner_manage on public.rooms
  for all to authenticated
  using ((select private.is_property_owner()))
  with check ((select private.is_property_owner()));

drop policy if exists tenants_self_update_profile on public.tenants;
create policy tenants_self_update_profile on public.tenants
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.protect_tenant_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.is_property_staff()) then
    return new;
  end if;

  if new.user_id <> (select auth.uid())
    or (to_jsonb(new) - array['first_name', 'last_name', 'initials', 'phone', 'emergency_contact'])
      is distinct from (to_jsonb(old) - array['first_name', 'last_name', 'initials', 'phone', 'emergency_contact']) then
    raise exception 'Tenants may only update their own contact and name fields';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_tenant_profile_updates on public.tenants;
create trigger protect_tenant_profile_updates
  before update on public.tenants
  for each row execute function public.protect_tenant_profile_updates();
revoke all on function public.protect_tenant_profile_updates() from public, anon, authenticated;

-- Signups create a Supabase profile and a pending tenant record in the same
-- Auth transaction, including when email confirmation is enabled.
create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  full_name text := trim(coalesce(new.raw_user_meta_data ->> 'full_name', 'Tenant'));
  first_name text;
  last_name text;
begin
  first_name := coalesce(nullif(split_part(full_name, ' ', 1), ''), 'Tenant');
  last_name := nullif(trim(substr(full_name, length(first_name) + 1)), '');

  insert into public.profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'tenant')
  on conflict (id) do nothing;

  insert into public.tenants (
    id, user_id, first_name, last_name, initials, phone, account_status
  ) values (
    'tenant-' || new.id::text,
    new.id,
    first_name,
    coalesce(last_name, ''),
    upper(left(first_name, 1) || coalesce(left(last_name, 1), left(first_name, 1))),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'pending'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Restore the Supabase UID-based protection trigger that Firebase-specific
-- migrations replaced for the initial room request workflow.
drop trigger if exists protect_firebase_assignment_request_updates on public.room_assignment_requests;
drop function if exists public.protect_firebase_assignment_request_updates();

create or replace function public.protect_tenant_row_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.is_property_staff()) then
    return new;
  end if;

  if tg_table_name = 'tenant_notifications'
    and (to_jsonb(new) - array['read', 'dismissed'])
      is distinct from (to_jsonb(old) - array['read', 'dismissed']) then
    raise exception 'Tenants may only update their own notification read or dismissed state';
  end if;

  if tg_table_name = 'room_assignment_requests'
    and (to_jsonb(new) - array[
      'requested_room_id', 'initial_payment_amount', 'payment_date',
      'payment_reference', 'payment_proof_path', 'payment_proof_status',
      'status', 'updated_at'
    ]) is distinct from (to_jsonb(old) - array[
      'requested_room_id', 'initial_payment_amount', 'payment_date',
      'payment_reference', 'payment_proof_path', 'payment_proof_status',
      'status', 'updated_at'
    ]) then
    raise exception 'Tenants may only retry their own room request';
  end if;

  return new;
end;
$$;

drop policy if exists initial_setup_read_own_or_staff on public.room_assignment_requests;
drop policy if exists initial_setup_tenant_create on public.room_assignment_requests;
drop policy if exists initial_setup_tenant_retry on public.room_assignment_requests;
drop policy if exists initial_setup_staff_manage on public.room_assignment_requests;

create policy assignment_requests_read_own_or_staff on public.room_assignment_requests
  for select to authenticated
  using ((select private.owns_tenant(tenant_id)) or (select private.is_property_staff()));

create policy assignment_requests_tenant_create on public.room_assignment_requests
  for insert to authenticated
  with check (
    (select private.owns_tenant(tenant_id))
    and status = 'pending'
    and payment_proof_status = 'pending'
    and initial_payment_amount > 0
    and payment_date is not null
    and payment_proof_path like tenant_id || '/%'
  );

create policy assignment_requests_tenant_retry on public.room_assignment_requests
  for update to authenticated
  using ((select private.owns_tenant(tenant_id)) and status in ('pending', 'rejected'))
  with check (
    (select private.owns_tenant(tenant_id))
    and status = 'pending'
    and payment_proof_status = 'pending'
    and initial_payment_amount > 0
    and payment_date is not null
    and payment_proof_path like tenant_id || '/%'
  );

create policy assignment_requests_staff_manage on public.room_assignment_requests
  for all to authenticated
  using ((select private.is_property_staff()))
  with check ((select private.is_property_staff()));

-- Receipts use tenant-{tenant UUID} paths, and staff can review all receipts.
revoke all on public.room_assignment_requests from anon;
revoke all on storage.objects from anon;
drop policy if exists initial_payment_proofs_tenant_upload on storage.objects;
drop policy if exists initial_payment_proofs_read_own_or_staff on storage.objects;

create policy initial_payment_proofs_tenant_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'initial-payment-proofs'
    and exists (
      select 1 from public.tenants t
      where t.id = (storage.foldername(name))[1]
        and t.user_id = (select auth.uid())
    )
  );

create policy initial_payment_proofs_read_own_or_staff on storage.objects
  for select to authenticated
  using (
    bucket_id = 'initial-payment-proofs'
    and (
      (select private.is_property_staff())
      or exists (
        select 1 from public.tenants t
        where t.id = (storage.foldername(name))[1]
          and t.user_id = (select auth.uid())
      )
    )
  );

-- Preserve the all-or-nothing writes previously provided by Firestore batches.
create or replace function public.approve_tenant_application(
  p_tenant_id text,
  p_room_id text,
  p_lease jsonb,
  p_invoice jsonb,
  p_payment jsonb,
  p_notification jsonb,
  p_approved_at text,
  p_approved_by uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant_status text;
  room_status text;
begin
  if not (select private.is_property_staff()) then
    raise exception 'Only property staff can approve tenant applications';
  end if;

  select t.account_status into tenant_status
  from public.tenants t where t.id = p_tenant_id for update;
  if tenant_status is distinct from 'pending' then
    raise exception 'Tenant application is no longer pending';
  end if;

  select r.status into room_status
  from public.rooms r where r.id = p_room_id for update;
  if room_status is distinct from 'vacant' then
    raise exception 'Room is no longer vacant';
  end if;

  update public.tenants
  set account_status = 'approved', approved_at = p_approved_at, approved_by = p_approved_by
  where id = p_tenant_id;

  insert into public.leases
  select (jsonb_populate_record(null::public.leases, p_lease)).*;

  insert into public.invoices
  select (jsonb_populate_record(null::public.invoices, p_invoice)).*;

  if p_payment is not null then
    insert into public.payments
    select (jsonb_populate_record(null::public.payments, p_payment)).*;
  end if;

  update public.rooms set status = 'occupied' where id = p_room_id;

  insert into public.tenant_notifications
  select (jsonb_populate_record(null::public.tenant_notifications, p_notification)).*;
end;
$$;

create or replace function public.reject_tenant_application(
  p_tenant_id text,
  p_rejected_at text,
  p_rejection_reason text,
  p_notification jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_property_staff()) then
    raise exception 'Only property staff can reject tenant applications';
  end if;

  update public.tenants
  set account_status = 'rejected', rejected_at = p_rejected_at, rejection_reason = p_rejection_reason
  where id = p_tenant_id and account_status = 'pending';
  if not found then raise exception 'Tenant application is no longer pending'; end if;

  insert into public.tenant_notifications
  select (jsonb_populate_record(null::public.tenant_notifications, p_notification)).*;
end;
$$;

create or replace function public.record_tenant_payment(
  p_payment jsonb,
  p_invoice jsonb,
  p_lease_id text,
  p_due_day integer,
  p_notification jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invoice_id text;
begin
  if not (select private.is_property_staff()) then
    raise exception 'Only property staff can record payments';
  end if;

  invoice_id := p_invoice ->> 'id';
  perform 1 from public.invoices i where i.id = invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;

  insert into public.payments
  select (jsonb_populate_record(null::public.payments, p_payment)).*;

  update public.invoices i
  set status = u.status,
      total_amount = u.total_amount,
      security_deposit = u.security_deposit,
      due_date = u.due_date
  from jsonb_populate_record(null::public.invoices, p_invoice) as u
  where i.id = invoice_id;

  if p_due_day is not null then
    update public.leases set due_day_of_month = p_due_day where id = p_lease_id;
  end if;

  if p_notification is not null then
    insert into public.tenant_notifications
    select (jsonb_populate_record(null::public.tenant_notifications, p_notification)).*;
  end if;
end;
$$;

revoke all on function public.approve_tenant_application(text, text, jsonb, jsonb, jsonb, jsonb, text, uuid) from public, anon;
revoke all on function public.reject_tenant_application(text, text, text, jsonb) from public, anon;
revoke all on function public.record_tenant_payment(jsonb, jsonb, text, integer, jsonb) from public, anon;
grant execute on function public.approve_tenant_application(text, text, jsonb, jsonb, jsonb, jsonb, text, uuid) to authenticated;
grant execute on function public.reject_tenant_application(text, text, text, jsonb) to authenticated;
grant execute on function public.record_tenant_payment(jsonb, jsonb, text, integer, jsonb) to authenticated;

-- Firebase token helper functions are no longer part of the authorization path.
drop function if exists public.is_firebase_property_staff();
drop function if exists public.is_firebase_app_user();

notify pgrst, 'reload schema';
