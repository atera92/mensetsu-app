// components/ModernVoiceUI.tsx
"use client";

import React from 'react';
import { Mic, Sparkles, User, Bot, BarChart3 } from 'lucide-react';

export default function ModernVoiceUI() {
  // デザイン確認用のダミーデータ（実際にはここにロジックが入ります）
  const messages = [
    { role: 'user', text: 'Reactの勉強方法を教えて' },
    { role: 'ai', text: 'Reactを学ぶには、まず公式ドキュメントのチュートリアルから始めるのがおすすめです。実際に手を動かしながら小さなアプリを作ってみましょう。' },
  ];
  const isRecording = false; // 録音中の見た目確認用（trueにすると変化します）

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 overflow-hidden relative">
      
      {/* 背景の装飾（光の玉） */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      {/* ヘッダー */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/10 bg-slate-950/70 backdrop-blur-md flex items-center justify-between px-6 shadow-lg shadow-black/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Gemini Voice
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Online
        </div>
      </header>

      {/* チャットエリア */}
      <main className="pt-24 pb-48 px-4 max-w-2xl mx-auto min-h-screen flex flex-col gap-6">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* アバターアイコン */}
            <div className={`
              shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-xl border border-white/10
              ${msg.role === 'user' 
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                : 'bg-slate-800'
              }
            `}>
              {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-cyan-400" />}
            </div>

            {/* 吹き出し */}
            <div className={`
              relative p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-lg
              ${msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/20'
                : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none backdrop-blur-sm'
              }
            `}>
              {msg.text}
            </div>
          </div>
        ))}
      </main>

      {/* フッター操作パネル */}
      <div className="fixed bottom-0 inset-x-0 z-50">
        {/* グラデーションのフェード */}
        <div className="h-24 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pointer-events-none" />
        
        <div className="bg-slate-950/80 backdrop-blur-xl border-t border-white/10 pb-8 pt-4 px-6">
          <div className="max-w-md mx-auto relative flex items-center justify-center min-h-[80px]">
            
            {/* 録音ボタン */}
            <button 
              className={`
                group relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-500
                ${isRecording 
                  ? 'bg-red-500 scale-110 shadow-[0_0_40px_-10px_rgba(239,68,68,0.6)]' 
                  : 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-[0_0_30px_-5px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_-5px_rgba(6,182,212,0.6)] hover:scale-105 active:scale-95'
                }
              `}
            >
              {/* 波紋エフェクト */}
              <div className="absolute inset-0 rounded-full border border-white/20 scale-125 opacity-0 group-hover:scale-150 group-hover:opacity-100 transition-all duration-700" />
              
              {isRecording ? (
                // 録音中の波形アイコン（疑似）
                <div className="flex items-center gap-1">
                  {[1,2,3,4].map(n => (
                    <div key={n} className="w-1 bg-white rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ height: 12 + Math.random() * 16, animationDelay: `${n * 0.1}s` }} />
                  ))}
                </div>
              ) : (
                <Mic className="w-8 h-8 text-white fill-white/20" />
              )}
            </button>

            {/* ガイドテキスト */}
            <div className="absolute -top-12 left-0 right-0 text-center">
              <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 backdrop-blur-md">
                {isRecording ? "Listening..." : "Tap to speak"}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* Tailwind用のカスタムアニメーション定義（必要であればglobals.cssに追加しますが、なくても動く範囲にしています） */}
      <style jsx global>{`
        @keyframes music-bar {
          0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
          50% { transform: scaleY(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}