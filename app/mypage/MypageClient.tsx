"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Trophy, Calendar, Clock, Activity, X, Quote } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

// 型定義
type InterviewRecord = {
  id: number;
  created_at: string;
  score: number;
  good_points: string;
  advice: string;
  comment: string;
  metrics: {
    voice_volume: number;
    response_quality: number;
    company_match: number;
    episodes: number;
    clarity: number;
  };
};

// レーダーチャート（再利用）
const RadarChart = ({
  metrics,
  sizeOverride,
}: {
  metrics: InterviewRecord["metrics"];
  sizeOverride?: number;
}) => {
  if (!metrics) return null;
  const size = sizeOverride ?? 120;
  const center = size / 2;
  const radius = (sizeOverride ? sizeOverride : 120) >= 180 ? 70 : 40;

  const dataValues = [
    metrics.voice_volume,
    metrics.response_quality,
    metrics.company_match,
    metrics.episodes,
    metrics.clarity,
  ];

  const angleToRad = (angle: number) => (Math.PI / 180) * angle;

  const points = dataValues
    .map((value, i) => {
      const angle = i * (360 / 5) - 90;
      const r = (radius / 5) * (value || 0);
      const x = center + r * Math.cos(angleToRad(angle));
      const y = center + r * Math.sin(angleToRad(angle));
      return `${x},${y}`;
    })
    .join(" ");

  const getGridPoints = (level: number) => {
    return Array.from({ length: 5 })
      .map((_, i) => {
        const angle = i * (360 / 5) - 90;
        const r = (radius / 5) * level;
        const x = center + r * Math.cos(angleToRad(angle));
        const y = center + r * Math.sin(angleToRad(angle));
        return `${x},${y}`;
      })
      .join(" ");
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {[5, 3, 1].map((level) => (
        <polygon
          key={level}
          points={getGridPoints(level)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      ))}
      <polygon points={points} fill="rgba(15, 155, 142, 0.28)" stroke="#0f9b8e" strokeWidth="2" />
    </svg>
  );
};

export default function MypageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const view = searchParams.get("view") || "card";
  const idParam = searchParams.get("id");
  const recordId = idParam ? Number(idParam) : null;

  const HISTORY_LIMIT = 50;

  // ✅ ブラウザ側のSupabaseクライアント（セッション保持あり）
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current!;

  const [records, setRecords] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<InterviewRecord | null>(null);

  // ✅ 詳細表示用（別タブ）
  const [detail, setDetail] = useState<InterviewRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ✅ ログイン必須：自分の面接履歴だけ取得
  useEffect(() => {
    let cancelled = false;

    const load = async (attempt = 0) => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData.session;

      // OAuth直後などでセッション反映が遅いことがあるので少しリトライ
      if (!session && attempt < 5) {
        setTimeout(() => {
          if (!cancelled) load(attempt + 1);
        }, 300);
        return;
      }

      // セッションが無ければログインへ
      if (sessionError || !session) {
        if (!cancelled) {
          setLoading(false);
          setDetailLoading(false);
          router.replace("/login");
        }
        return;
      }

      // ✅ detail表示の場合：1件だけ取得
      if (view === "detail") {
        if (!recordId || Number.isNaN(recordId)) {
          if (!cancelled) {
            setDetail(null);
            setDetailLoading(false);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setLoading(false);
          setDetailLoading(true);
        }

        const { data, error } = await supabase
          .from("interviews")
          .select("id, created_at, score, good_points, advice, comment, metrics")
          .eq("user_id", session.user.id)
          .eq("id", recordId)
          .single();

        if (!cancelled) {
          if (error) {
            console.error("Error fetching detail:", error);
            setDetail(null);
          } else {
            setDetail((data as InterviewRecord) || null);
          }
          setDetailLoading(false);
        }
        return;
      }

      // ✅ 通常（カード一覧）
      const { data, error } = await supabase
        .from("interviews")
        .select("id, created_at, score, good_points, advice, comment, metrics")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT);

      if (!cancelled) {
        if (error) {
          console.error("Error fetching data:", error);
          setRecords([]);
        } else {
          setRecords((data as InterviewRecord[]) || []);
        }
        setLoading(false);
      }
    };

    load();

    // セッションが後から入る/切れるケースに備えて監視
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session) {
        setRecords([]);
        setDetail(null);
        setLoading(false);
        setDetailLoading(false);
        router.replace("/login");
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [router, supabase, view, recordId]);

  // ✅ 別タブ詳細ページ（/mypage?view=detail&id=xxx）
  if (view === "detail") {
    return (
      <div className="min-h-screen p-6 md:p-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/mypage"
              className="text-slate-500 hover:text-brand-700 flex items-center font-bold transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-1" /> マイページへ戻る
            </Link>

            <form action="/logout" method="post" className="inline">
              <button
                type="submit"
                className="text-slate-500 hover:text-red-600 font-bold transition-colors"
              >
                ログアウト
              </button>
            </form>
          </div>

          {detailLoading ? (
            <div className="text-center py-20 text-slate-400">読み込み中...</div>
          ) : !detail ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
              データが見つかりませんでした。
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-400 tracking-widest">DETAIL</p>
                <h1 className="text-xl font-bold text-slate-800">{new Date(detail.created_at).toLocaleString()}</h1>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="flex flex-col items-center min-w-[140px]">
                    <p className="text-sm font-bold text-slate-400 tracking-widest">TOTAL SCORE</p>
                    <p className="text-6xl font-black text-brand-700">
                      {detail.score}
                      <span className="text-2xl text-slate-300 ml-1">/100</span>
                    </p>
                  </div>
                  <div className="opacity-90">
                    <RadarChart metrics={detail.metrics} sizeOverride={200} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <h4 className="font-bold text-green-800 flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4" /> 良かった点
                    </h4>
                    <p className="text-green-900 text-sm leading-relaxed">{detail.good_points}</p>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-1">
                      <Activity className="w-4 h-4" /> 改善アドバイス
                    </h4>
                    <p className="text-orange-900 text-sm leading-relaxed">{detail.advice}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-1">
                      <Quote className="w-4 h-4" /> 総評
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed">{detail.comment}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 統計データの計算（通常ページのみ）
  const averageScore =
    records.length > 0 ? Math.round(records.reduce((acc, cur) => acc + (cur.score || 0), 0) / records.length) : 0;

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-slate-500 hover:text-brand-700 flex items-center font-bold transition-colors">
            <ArrowLeft className="w-5 h-5 mr-1" /> TOPに戻る
          </Link>

          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-800">マイページ（面接履歴）</h1>

            <form action="/logout" method="post" className="inline">
              <button
                type="submit"
                className="text-slate-500 hover:text-red-600 font-bold transition-colors"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
            <span className="text-slate-400 text-sm font-bold mb-1 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> 平均スコア
            </span>
            <span className="text-4xl font-black text-slate-800">
              {averageScore}
              <span className="text-lg text-slate-300 ml-1">点</span>
            </span>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
            <span className="text-slate-400 text-sm font-bold mb-1 flex items-center gap-2">
              <Activity className="w-4 h-4" /> 練習回数
            </span>
            <span className="text-4xl font-black text-slate-800">
              {records.length}
              <span className="text-lg text-slate-300 ml-1">回</span>
            </span>
          </div>
        </div>

        {/* 履歴リスト */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> 過去の履歴
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">読み込み中...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
            まだデータがありません。面接練習をしてみましょう！
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {records.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelected(record)}
                  className="w-full text-left bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 items-center"
                >
                  {/* 左：スコアと日付 */}
                  <div className="flex flex-col items-center min-w-[100px]">
                    <span className="text-3xl font-black text-brand-700">{record.score}</span>
                    <span className="text-xs text-slate-400 mt-1 font-bold">SCORE</span>
                    <div className="mt-2 text-xs text-slate-400 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {new Date(record.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* 中央：グラフ（クリックで別タブ詳細） */}
                  <button
                    type="button"
                    className="hidden sm:block opacity-80 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation(); // ← カードのモーダルを開かない
                      window.open(`/mypage?view=detail&id=${record.id}`, "_blank", "noopener,noreferrer");
                    }}
                    aria-label="グラフを別タブで開く"
                  >
                    <RadarChart metrics={record.metrics} />
                  </button>

                  {/* 右：コメント */}
                  <div className="flex-1 w-full">
                    <div className="mb-2">
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md mr-2">GOOD</span>
                      <span className="text-sm text-slate-600">{record.good_points}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md mr-2">ADVICE</span>
                      <span className="text-sm text-slate-600">{record.advice}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* 詳細モーダル（カードクリック時） */}
            {selected && (
              <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-400 tracking-widest">DETAIL</p>
                      <h3 className="text-lg font-bold text-slate-800">{new Date(selected.created_at).toLocaleString()}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                      aria-label="閉じる"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                      <div className="flex flex-col items-center min-w-[140px]">
                        <p className="text-sm font-bold text-slate-400 tracking-widest">TOTAL SCORE</p>
                        <p className="text-6xl font-black text-brand-700">
                          {selected.score}
                          <span className="text-2xl text-slate-300 ml-1">/100</span>
                        </p>
                      </div>
                      <div className="opacity-90">
                        <RadarChart metrics={selected.metrics} sizeOverride={160} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <h4 className="font-bold text-green-800 flex items-center gap-2 mb-1">
                          <Trophy className="w-4 h-4" /> 良かった点
                        </h4>
                        <p className="text-green-900 text-sm leading-relaxed">{selected.good_points}</p>
                      </div>

                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-1">
                          <Activity className="w-4 h-4" /> 改善アドバイス
                        </h4>
                        <p className="text-orange-900 text-sm leading-relaxed">{selected.advice}</p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-1">
                          <Quote className="w-4 h-4" /> 総評
                        </h4>
                        <p className="text-slate-600 text-sm leading-relaxed">{selected.comment}</p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelected(null)}
                        className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                      >
                        閉じる
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
