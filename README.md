# mensetsu-app

面接練習アプリ（Next.js + Supabase + 音声WebSocket）。
フリーミアム課金（Stripe月額サブスク）に対応。事業設計は [BUSINESS.md](./BUSINESS.md) を参照。

## 課金（フリーミアム）

- Free: 1日15分まで無料
- Premium: 月額¥980で1日120分まで
- 加入/解約/権限付与はすべて Stripe Webhook 経由で自動同期（`app/api/billing/*`）。

セットアップ手順は [BUSINESS.md](./BUSINESS.md) の「6. セットアップ手順」を参照。

## 必須環境変数

### フロント（Vercel）
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_WS_URL`（例: `wss://<audio-server-host>`）
- `NEXT_PUBLIC_WS_TOKEN`（音声サーバーと同じ値）
- `NEXT_PUBLIC_SITE_URL`（例: `https://<本番ドメイン>`。Checkout/ポータルのリダイレクト先）
- `GEMINI_API_KEY`（会話モード面接 `/api/interview/*` が使用）
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`（Premium月額のPrice ID）

## 面接モード

- **会話モード（既定）**: 追加サーバー不要。`/api/interview/chat|finish` がGeminiを直接呼び、
  ブラウザの音声認識(マイク入力)と読み上げで対話する。Vercelのみで完結。
- **音声通話モード**: `NEXT_PUBLIC_WS_URL` を設定した場合のみ選択肢に表示。
  `server.ts`（Gemini Liveのリアルタイム音声）をRender等で稼働させる必要がある。

## Googleログインの有効化（Supabase側の設定）

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) で
   OAuthクライアントID（Webアプリ）を作成
   - 承認済みリダイレクトURI: `https://<プロジェクトref>.supabase.co/auth/v1/callback`
2. Supabaseダッシュボード → Authentication → Providers → Google を有効化し、
   クライアントIDとシークレットを貼り付け
3. Authentication → URL Configuration で
   - Site URL: `https://<本番ドメイン>`
   - Redirect URLs: `https://<本番ドメイン>/auth/callback`（プレビュー用に `http://localhost:3000/auth/callback` も）
   を設定

※ 本アプリは1アカウント1端末制。別端末でのログインは拒否され、ログイン画面に理由が表示される。

### 音声サーバー（Render など）
- `GEMINI_API_KEY`
- `SUPABASE_URL`（SupabaseのプロジェクトURL）
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUDIO_WS_TOKEN`（フロントの `NEXT_PUBLIC_WS_TOKEN` と同じ値）
- `ALLOWED_ORIGINS`（カンマ区切り）
- `MAX_SESSIONS`（例: `5`）
- `MAX_SESSION_MS`（例: `600000` = 10分）
- `SESSION_TTL_MS`（例: `180000` = 切断後3分）
- `MAX_RECORDING_BYTES`（例: `67108864` = 64MB）
- `DAILY_LIMIT_SECONDS`（例: `900` = 15分。Freeの上限）
- `PREMIUM_DAILY_LIMIT_SECONDS`（例: `7200` = 120分。Premiumの上限）

## Supabase テーブル設定

```sql
create table if not exists user_devices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  device_id text unique not null,
  last_seen_at timestamptz not null default now()
);

alter table user_devices enable row level security;

create policy "user_devices own access" on user_devices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists daily_usage (
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  seconds_used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table daily_usage enable row level security;
```

課金テーブル（`subscriptions`）は [`supabase/schema.sql`](./supabase/schema.sql) を実行して作成してください。

## ローカル起動

```bash
npm install
npm run dev
```

## 音声サーバー起動

```bash
npx tsx server.ts
```
