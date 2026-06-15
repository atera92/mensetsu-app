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

-- ============================================================
-- 面接のパーソナライズ設定
-- クライアントが接続前に保存し、音声サーバーが session_id で読み出して
-- 面接官プロンプトを個別化する。企業/職種/提出資料はプレミアム限定で反映。
-- ============================================================

create table if not exists interview_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  scenario text not null default 'general',
  difficulty text not null default 'normal',
  company text,
  role text,
  focus text,
  material text,
  created_at timestamptz not null default now()
);

create index if not exists interview_setups_session_idx
  on interview_setups (user_id, session_id, created_at desc);

alter table interview_setups enable row level security;

drop policy if exists "interview_setups own access" on interview_setups;
create policy "interview_setups own access" on interview_setups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
