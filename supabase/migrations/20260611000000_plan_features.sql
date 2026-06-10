-- Draftly plan features: teams, usage metering, proposals, client profiles,
-- brand voice, analytics. RLS-first; privileged writes via service_role-only RPCs.

-- ── 0. Private schema for RLS helpers (never exposed via PostgREST) ─────────
create schema if not exists private;
grant usage on schema private to authenticated;

-- ── 1. Team members ─────────────────────────────────────────────────────────
-- account_id = the team owner (whose Agency subscription grants access).
-- invited_email is stored lowercased; user_id stays NULL until claimed.
create table if not exists public.team_members (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references auth.users (id) on delete cascade,
  invited_email text not null check (invited_email = lower(invited_email)),
  user_id       uuid references auth.users (id) on delete cascade,
  invited_at    timestamptz not null default now(),
  claimed_at    timestamptz,
  unique (account_id, invited_email),
  check (user_id is null or user_id <> account_id)
);
create index if not exists team_members_user_idx
  on public.team_members (user_id) where user_id is not null;
create index if not exists team_members_unclaimed_email_idx
  on public.team_members (invited_email) where user_id is null;

alter table public.team_members enable row level security;

-- SECURITY DEFINER helper: is the current user the owner of, or a claimed
-- member of, this account? Definer is required (a) to read team_members from
-- inside team_members' own policies without recursion, (b) without loosening
-- table RLS. Locked search_path; EXECUTE restricted to authenticated.
create or replace function private.has_account_access(account uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select account = (select auth.uid())
      or exists (
           select 1 from public.team_members tm
           where tm.account_id = account
             and tm.user_id = (select auth.uid())
         );
$$;
revoke execute on function private.has_account_access(uuid) from public;
grant execute on function private.has_account_access(uuid) to authenticated;

create policy "Owner and members read team roster"
  on public.team_members for select to authenticated
  using (private.has_account_access(account_id));

create policy "Owner invites by email"
  on public.team_members for insert to authenticated
  with check ((select auth.uid()) = account_id and user_id is null);

create policy "Owner removes anyone; member removes self"
  on public.team_members for delete to authenticated
  using ((select auth.uid()) = account_id or (select auth.uid()) = user_id);

-- No UPDATE policy: claiming happens exclusively inside resolve_access().

-- Seat limit: Agency = 5 seats INCLUDING the owner, i.e. max 4 member rows.
-- Trigger (not app code) so concurrent invites cannot oversubscribe.
create or replace function private.enforce_seat_limit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('team_seats:' || new.account_id::text));
  if (select count(*) from public.team_members where account_id = new.account_id) >= 4 then
    raise exception 'TEAM_SEAT_LIMIT'
      using detail = 'Agency includes 5 seats: the owner plus 4 invited teammates.';
  end if;
  return new;
end;
$$;
drop trigger if exists team_members_seat_limit on public.team_members;
create trigger team_members_seat_limit
  before insert on public.team_members
  for each row execute function private.enforce_seat_limit();

-- ── 2. Usage counters (Solo monthly cap) ────────────────────────────────────
-- Counters start at zero when this ships, so Solo users with historical
-- proposals are NOT retroactively blocked. Deleting proposals never refunds.
create table if not exists public.usage_counters (
  user_id    uuid not null references auth.users (id) on delete cascade,
  month      date not null,            -- first day of the UTC calendar month
  count      integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
alter table public.usage_counters enable row level security;

create policy "Users read own usage"
  on public.usage_counters for select to authenticated
  using ((select auth.uid()) = user_id);
-- No write policies: writes only via the service_role-only RPCs below.

-- Atomic consume: insert-or-conditionally-increment in one statement.
-- Returns the new count, or NULL when the cap is already reached. Two
-- concurrent requests at count 29 serialize on the row lock: one gets 30,
-- the other NULL. SECURITY INVOKER: service_role bypasses RLS anyway, and
-- EXECUTE is revoked from authenticated so the limit argument cannot be
-- forged from a browser JWT. The authoritative limit lives in lib/entitlements.ts.
create or replace function public.consume_generation(p_user_id uuid, p_limit integer)
returns integer
language sql security invoker set search_path = ''
as $$
  insert into public.usage_counters as uc (user_id, month, count)
  values (p_user_id, (date_trunc('month', now() at time zone 'utc'))::date, 1)
  on conflict (user_id, month) do update
    set count = uc.count + 1, updated_at = now()
    where uc.count < p_limit
  returning uc.count;
$$;
revoke execute on function public.consume_generation(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_generation(uuid, integer) to service_role;

-- Refund one generation when the model call fails after consuming.
create or replace function public.release_generation(p_user_id uuid)
returns void
language sql security invoker set search_path = ''
as $$
  update public.usage_counters
     set count = greatest(count - 1, 0), updated_at = now()
   where user_id = p_user_id
     and month = (date_trunc('month', now() at time zone 'utc'))::date;
$$;
revoke execute on function public.release_generation(uuid) from public, anon, authenticated;
grant execute on function public.release_generation(uuid) to service_role;

-- ── 3. Effective access resolver (+ invite auto-claim) ─────────────────────
-- SECURITY DEFINER is required: a team member must learn the OWNER's
-- subscription status, and subscriptions RLS deliberately only allows reading
-- your own row. Locked search_path; predicates pinned to auth.uid(); EXECUTE
-- limited to authenticated; claims use verified email from auth.users only.
create or replace function public.resolve_access()
returns table (account_id uuid, plan text, status text, via text, used_this_month integer)
language plpgsql security definer set search_path = ''
as $$
declare
  uid    uuid := (select auth.uid());
  uemail text;
begin
  if uid is null then return; end if;

  -- 3a. Auto-claim pending invites matching this user's VERIFIED email.
  select lower(u.email) into uemail
  from auth.users u
  where u.id = uid and u.email_confirmed_at is not null;

  if uemail is not null then
    update public.team_members tm
       set user_id = uid, claimed_at = now()
     where tm.user_id is null
       and tm.invited_email = uemail
       and tm.account_id <> uid;
  end if;

  -- 3b. Own active subscription wins.
  return query
    select s.user_id, s.plan, s.status, 'subscription'::text,
           coalesce((select uc.count from public.usage_counters uc
                     where uc.user_id = uid
                       and uc.month = (date_trunc('month', now() at time zone 'utc'))::date), 0)
    from public.subscriptions s
    where s.user_id = uid and s.status in ('active','trialing');
  if found then return; end if;

  -- 3c. Otherwise: claimed membership in a team whose owner holds an active
  -- Agency subscription. Owner cancels/downgrades -> join returns nothing ->
  -- members lose access immediately.
  return query
    select tm.account_id, s.plan, s.status, 'team'::text, 0
    from public.team_members tm
    join public.subscriptions s on s.user_id = tm.account_id
    where tm.user_id = uid
      and s.plan = 'agency'
      and s.status in ('active','trialing')
    order by tm.claimed_at asc
    limit 1;
end;
$$;
revoke execute on function public.resolve_access() from public, anon;
grant execute on function public.resolve_access() to authenticated;

-- ── 4. Proposals ────────────────────────────────────────────────────────────
create table if not exists public.proposals (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references auth.users (id) on delete cascade,
  created_by  uuid not null references auth.users (id) on delete cascade,
  client_name text,
  title       text,
  content     text not null default '',
  value       numeric(12,2) check (value is null or value >= 0),
  status      text not null default 'draft' check (status in ('draft','sent','won','lost')),
  model       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists proposals_account_created_idx on public.proposals (account_id, created_at desc);
create index if not exists proposals_account_status_idx  on public.proposals (account_id, status);

alter table public.proposals enable row level security;

create policy "Account reads proposals"
  on public.proposals for select to authenticated
  using (private.has_account_access(account_id));

create policy "Members insert own-authored proposals"
  on public.proposals for insert to authenticated
  with check ((select auth.uid()) = created_by and private.has_account_access(account_id));

create policy "Account updates proposals"
  on public.proposals for update to authenticated
  using (private.has_account_access(account_id))
  with check (private.has_account_access(account_id));

create policy "Author or owner deletes proposals"
  on public.proposals for delete to authenticated
  using ((select auth.uid()) = created_by or (select auth.uid()) = account_id);

-- ── 5. Client profiles (Studio+) ────────────────────────────────────────────
create table if not exists public.client_profiles (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references auth.users (id) on delete cascade,
  created_by       uuid not null references auth.users (id) on delete cascade,
  name             text not null,
  business_context text,
  default_budget   text,
  default_tone     text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists client_profiles_account_idx on public.client_profiles (account_id, name);

alter table public.client_profiles enable row level security;

create policy "Account reads client profiles"
  on public.client_profiles for select to authenticated
  using (private.has_account_access(account_id));

create policy "Account inserts client profiles"
  on public.client_profiles for insert to authenticated
  with check ((select auth.uid()) = created_by and private.has_account_access(account_id));

create policy "Account updates client profiles"
  on public.client_profiles for update to authenticated
  using (private.has_account_access(account_id))
  with check (private.has_account_access(account_id));

create policy "Account deletes client profiles"
  on public.client_profiles for delete to authenticated
  using (private.has_account_access(account_id));

-- ── 6. Brand voice (Agency) — one per account; owner writes, team reads ────
create table if not exists public.brand_voices (
  account_id     uuid primary key references auth.users (id) on delete cascade,
  voice_name     text not null default '',
  description    text not null default '',
  writing_sample text not null default '',
  updated_at     timestamptz not null default now()
);
alter table public.brand_voices enable row level security;

create policy "Team reads brand voice"
  on public.brand_voices for select to authenticated
  using (private.has_account_access(account_id));

create policy "Owner inserts brand voice"
  on public.brand_voices for insert to authenticated
  with check ((select auth.uid()) = account_id);

create policy "Owner updates brand voice"
  on public.brand_voices for update to authenticated
  using ((select auth.uid()) = account_id)
  with check ((select auth.uid()) = account_id);

create policy "Owner deletes brand voice"
  on public.brand_voices for delete to authenticated
  using ((select auth.uid()) = account_id);

-- ── 7. Win-rate analytics (Agency) ──────────────────────────────────────────
-- SECURITY INVOKER on purpose: proposals RLS applies inside, so passing a
-- foreign account_id just returns zero rows.
create or replace function public.proposal_stats(p_account_id uuid)
returns table (month date, drafted integer, sent integer, won integer, lost integer, won_value numeric)
language sql stable security invoker set search_path = ''
as $$
  select (date_trunc('month', p.created_at))::date as month,
         count(*)::integer                                           as drafted,
         count(*) filter (where p.status <> 'draft')::integer        as sent,
         count(*) filter (where p.status = 'won')::integer           as won,
         count(*) filter (where p.status = 'lost')::integer          as lost,
         coalesce(sum(p.value) filter (where p.status = 'won'), 0)   as won_value
  from public.proposals p
  where p.account_id = p_account_id
  group by 1 order by 1 desc limit 12;
$$;
revoke execute on function public.proposal_stats(uuid) from public, anon;
grant execute on function public.proposal_stats(uuid) to authenticated;
