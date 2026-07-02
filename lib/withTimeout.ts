/**
 * 外部サービス(Supabase等)への待機に上限を設ける。
 * 認証基盤が応答しなくても、サイト全体がハングしないようにするための保護。
 * タイムアウト/例外時は fallback を返し、ページは「未ログイン」として描画を続行する。
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
