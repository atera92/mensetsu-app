"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const ensureDeviceId = () => {
    let deviceId = window.localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem("device_id", deviceId);
    }
    const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `device_id=${deviceId}; Path=/; Max-Age=31536000; SameSite=Lax${secureFlag}`;
    return deviceId;
  };

  const onGoogleLogin = async () => {
    setLoading(true);
    const supabase = createClient();
    ensureDeviceId();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/mypage`,
      },
    });
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-12">
      <div className="absolute left-6 top-6">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> TOPへ
        </Link>
      </div>

      <div className="w-full max-w-md animate-rise">
        <div className="glass rounded-4xl p-8 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-glow [background-image:var(--brand-grad)] font-display">
              面
            </div>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.4em] text-brand-700">
              Mensetsu Studio
            </p>
            <h1 className="mt-2 text-2xl font-bold text-ink">ログイン / 新規登録</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Googleアカウントで数秒で始められます。<br />
              面接練習の記録は、あなたのアカウントに安全に保存されます。
            </p>
          </div>

          <button
            onClick={onGoogleLogin}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-6 py-3.5 text-sm font-bold text-ink shadow-halo transition hover:border-brand hover:shadow-halo-lg active:scale-[0.98] disabled:opacity-60"
          >
            <GoogleIcon />
            {loading ? "リダイレクト中..." : "Googleで続行"}
          </button>

          <div className="mt-7 space-y-2.5">
            <Feature icon={<Sparkles className="h-4 w-4 text-brand-600" />}>
              AI面接官があなたの回答を音声で深掘り
            </Feature>
            <Feature icon={<ShieldCheck className="h-4 w-4 text-brand-600" />}>
              1日15分まで無料。まずはお試しから
            </Feature>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          続行することで、利用規約とプライバシーポリシーに同意したものとみなされます。
        </p>
      </div>
    </main>
  );
}

function Feature({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/60 px-4 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50">
        {icon}
      </span>
      <span className="text-sm text-ink/80">{children}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C39.999 36.205 44 30.659 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
