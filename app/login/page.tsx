"use client";

import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const ensureDeviceId = () => {
    let deviceId = window.localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem("device_id", deviceId);
    }
    const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `device_id=${deviceId}; Path=/; Max-Age=31536000; SameSite=Lax${secureFlag}`;
    return deviceId;
  };

  const onGoogleLogin = async () => {
    const supabase = createClient();
    ensureDeviceId();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Googleログイン後、ここに戻ってきてセッションを保存する
        redirectTo: `${window.location.origin}/auth/callback?next=/mypage`,
      },
    });
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>ログイン</h1>
      <p>Googleでログインします。</p>

      <button onClick={onGoogleLogin} style={{ padding: "10px 14px" }}>
        Googleでログイン
      </button>
    </main>
  );
}
