# mensetsu-app

面接練習アプリ（Next.js + Supabase + 音声WebSocket）。

## 必須環境変数

### フロント（Vercel）
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_WS_URL`（例: `wss://<audio-server-host>`）
- `NEXT_PUBLIC_WS_TOKEN`（音声サーバーと同じ値）

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
- `DAILY_LIMIT_SECONDS`（例: `900` = 15分）

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

## ローカル起動

```bash
npm install
npm run dev
```

## 音声サーバー起動

```bash
npx tsx server.ts
```
