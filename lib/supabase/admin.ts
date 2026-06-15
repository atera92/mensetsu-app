import { createClient } from "@supabase/supabase-js";

/**
 * サービスロール（RLSをバイパス）でアクセスする管理用クライアント。
 * Webhook など、ユーザーセッションを持たないサーバー処理からのみ使用する。
 * 絶対にクライアント側へ露出させないこと。
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です。");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
