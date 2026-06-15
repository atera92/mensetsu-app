"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanId } from "../../lib/plan";

export default function PricingActions({
  plan,
  loggedIn,
}: {
  plan: PlanId;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async (endpoint: "checkout" | "portal") => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/${endpoint}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "エラーが発生しました");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setLoading(false);
    }
  };

  if (!loggedIn) {
    return (
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="w-full rounded-lg bg-emerald-500 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-600"
      >
        ログインして始める
      </button>
    );
  }

  if (plan === "premium") {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-emerald-50 py-3 text-center text-sm font-bold text-emerald-700">
          ご利用中のプラン
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => go("portal")}
          className="w-full rounded-lg border border-slate-300 py-2.5 text-center text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "..." : "プランを管理 / 解約"}
        </button>
        {error && <p className="text-center text-xs text-rose-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={loading}
        onClick={() => go("checkout")}
        className="w-full rounded-lg bg-emerald-500 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
      >
        {loading ? "リダイレクト中..." : "プレミアムを始める"}
      </button>
      {error && <p className="text-center text-xs text-rose-500">{error}</p>}
    </div>
  );
}
