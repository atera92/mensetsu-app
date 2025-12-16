/**
 * app/mypage/page.tsx
 * 機能: 面接履歴の表示、平均スコア、過去の振り返り
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Calendar, Clock, ChevronRight, Activity } from "lucide-react";
import { supabase } from "../../lib/supabase"; // 相対パスに注意

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
const RadarChart = ({ metrics }: { metrics: InterviewRecord['metrics'] }) => {
    if (!metrics) return null;
    const size = 120; // 少し小さめに
    const center = size / 2;
    const radius = 40;
    const dataValues = [
      metrics.voice_volume, metrics.response_quality, metrics.company_match, metrics.episodes, metrics.clarity
    ];
    const angleToRad = (angle: number) => (Math.PI / 180) * angle;
    
    const points = dataValues.map((value, i) => {
      const angle = i * (360 / 5) - 90;
      const r = (radius / 5) * (value || 0);
      const x = center + r * Math.cos(angleToRad(angle));
      const y = center + r * Math.sin(angleToRad(angle));
      return `${x},${y}`;
    }).join(" ");
  
    const getGridPoints = (level: number) => {
      return Array.from({ length: 5 }).map((_, i) => {
        const angle = i * (360 / 5) - 90;
        const r = (radius / 5) * level;
        const x = center + r * Math.cos(angleToRad(angle));
        const y = center + r * Math.sin(angleToRad(angle));
        return `${x},${y}`;
      }).join(" ");
    };
  
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {[5, 3, 1].map((level) => (
          <polygon key={level} points={getGridPoints(level)} fill="none" stroke="#e2e8f0" strokeWidth="1" />
        ))}
        <polygon points={points} fill="rgba(37, 99, 235, 0.3)" stroke="#2563eb" strokeWidth="2" />
      </svg>
    );
  };

export default function MyPage() {
  const [records, setRecords] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .order('created_at', { ascending: false }); // 新しい順

      if (error) {
        console.error("Error fetching data:", error);
      } else {
        setRecords(data || []);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // 統計データの計算
  const averageScore = records.length > 0 
    ? Math.round(records.reduce((acc, cur) => acc + (cur.score || 0), 0) / records.length) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
            <Link href="/" className="text-slate-500 hover:text-blue-600 flex items-center font-bold transition-colors">
                <ArrowLeft className="w-5 h-5 mr-1" /> TOPに戻る
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">マイページ（面接履歴）</h1>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                <span className="text-slate-400 text-sm font-bold mb-1 flex items-center gap-2"><Trophy className="w-4 h-4" /> 平均スコア</span>
                <span className="text-4xl font-black text-slate-800">{averageScore}<span className="text-lg text-slate-300 ml-1">点</span></span>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                <span className="text-slate-400 text-sm font-bold mb-1 flex items-center gap-2"><Activity className="w-4 h-4" /> 練習回数</span>
                <span className="text-4xl font-black text-slate-800">{records.length}<span className="text-lg text-slate-300 ml-1">回</span></span>
            </div>
        </div>

        {/* 履歴リスト */}
        <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> 過去の履歴
        </h2>

        {loading ? (
            <div className="text-center py-20 text-slate-400">読み込み中...</div>
        ) : records.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                まだデータがありません。面接練習をしてみましょう！
            </div>
        ) : (
            <div className="space-y-4">
                {records.map((record) => (
                    <div key={record.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 items-center">
                        {/* 左：スコアと日付 */}
                        <div className="flex flex-col items-center min-w-[100px]">
                            <span className="text-3xl font-black text-blue-600">{record.score}</span>
                            <span className="text-xs text-slate-400 mt-1 font-bold">SCORE</span>
                            <div className="mt-2 text-xs text-slate-400 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full">
                                <Clock className="w-3 h-3" />
                                {new Date(record.created_at).toLocaleDateString()}
                            </div>
                        </div>

                        {/* 中央：グラフ */}
                        <div className="hidden sm:block opacity-80">
                             <RadarChart metrics={record.metrics} />
                        </div>

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
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}