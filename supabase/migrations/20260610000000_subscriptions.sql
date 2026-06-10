-- Draftly subscriptions: one row per user, written only by the Stripe webhook
-- (via the service-role key, which bypasses RLS). Users may read their own row.

create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  plan                   text,
  status                 text not null default 'inactive',
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Authenticated users can read ONLY their own subscription row.
-- There are deliberately no insert/update/delete policies: every write goes
-- through the service-role key in the Stripe webhook, which bypasses RLS.
drop policy if exists "Users can read own subscription" on public.subscriptions;
create policy "Users can read own subscription"
  on public.subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
