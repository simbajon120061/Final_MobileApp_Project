-- A tenant application is created only after Supabase confirms the email.
-- Earlier versions created pending tenant rows during unconfirmed sign-up.

delete from public.tenants t
using auth.users u
where t.user_id = u.id
  and t.account_status = 'pending'
  and u.email_confirmed_at is null;

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

  if new.email_confirmed_at is not null then
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
  end if;

  return new;
end;
$$;

create or replace function public.create_tenant_after_email_confirmation()
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
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    first_name := coalesce(nullif(split_part(full_name, ' ', 1), ''), 'Tenant');
    last_name := nullif(trim(substr(full_name, length(first_name) + 1)), '');

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
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed_tenant on auth.users;
create trigger on_auth_user_confirmed_tenant
  after update of email_confirmed_at on auth.users
  for each row execute function public.create_tenant_after_email_confirmation();

revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.create_tenant_after_email_confirmation() from public, anon, authenticated;

create or replace function public.require_confirmed_email_before_tenant_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.account_status is distinct from 'approved'
    and new.account_status = 'approved'
    and not exists (
      select 1
      from auth.users u
      where u.id = new.user_id
        and u.email_confirmed_at is not null
    ) then
    raise exception 'Tenant must confirm their email before approval';
  end if;

  return new;
end;
$$;

drop trigger if exists require_confirmed_email_before_tenant_approval on public.tenants;
create trigger require_confirmed_email_before_tenant_approval
  before update of account_status on public.tenants
  for each row execute function public.require_confirmed_email_before_tenant_approval();

revoke all on function public.require_confirmed_email_before_tenant_approval() from public, anon, authenticated;

notify pgrst, 'reload schema';
