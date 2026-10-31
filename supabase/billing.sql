-- Run once in the Supabase SQL editor. Clients cannot read or alter billing data.
create table if not exists public.billing_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_used integer not null default 0 check (free_used between 0 and 10),
  subscription_id text unique
);
create table if not exists public.audit_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.billing_accounts(user_id) on delete cascade,
  period text not null,
  created_at timestamptz not null default now()
);
alter table public.billing_accounts enable row level security;
alter table public.audit_credits enable row level security;
revoke all on public.billing_accounts, public.audit_credits from anon, authenticated;

-- Serialise reservations per account, including concurrent requests on different servers.
create or replace function public.reserve_audit(p_user uuid, p_period text, p_limit integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare used integer; ticket uuid;
begin
  perform 1 from billing_accounts where user_id = p_user for update;
  if not found then raise exception 'Account missing'; end if;
  if p_period = 'free' then
    select free_used into used from billing_accounts where user_id = p_user;
    if used >= 10 then return null; end if;
    update billing_accounts set free_used = free_used + 1 where user_id = p_user;
  else
    select count(*) into used from audit_credits where user_id = p_user and period = p_period;
    if p_limit <= 0 or used >= p_limit then return null; end if;
  end if;
  insert into audit_credits(user_id, period) values(p_user, p_period) returning id into ticket;
  return ticket;
end $$;
create or replace function public.refund_audit(p_ticket uuid)
returns void language plpgsql security definer set search_path = public as $$
declare credit audit_credits;
begin
  select * into credit from audit_credits where id = p_ticket;
  if not found then return; end if;
  perform 1 from billing_accounts where user_id = credit.user_id for update;
  delete from audit_credits where id = p_ticket;
  if found and credit.period = 'free' then
    update billing_accounts set free_used = greatest(0, free_used - 1) where user_id = credit.user_id;
  end if;
end $$;
revoke all on function public.reserve_audit(uuid,text,integer), public.refund_audit(uuid) from public, anon, authenticated;
grant execute on function public.reserve_audit(uuid,text,integer), public.refund_audit(uuid) to service_role;
