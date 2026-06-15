-- ============================================================
-- 課金（サブスクリプション）用テーブル
-- Stripe Webhook がサービスロールで upsert する。
-- 閲覧は本人のみ（RLS）。書き込みはサービスロールのみ。
-- ============================================================

create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free',          -- 'free' | 'premium'
  status text not null default 'inactive',    -- Stripe の subscription.status
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx
  on subscriptions (stripe_customer_id);

alter table subscriptions enable row level security;

-- 本人は自分のサブスク状態を閲覧できる（書き込みポリシーは作らない＝サービスロール専用）
drop policy if exists "subscriptions own read" on subscriptions;
create policy "subscriptions own read" on subscriptions
  for select using (auth.uid() = user_id);
