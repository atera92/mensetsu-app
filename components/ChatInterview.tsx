"use client";

/**
 * 会話モード面接：音声サーバー不要でVercelのみで動く面接の完成版UI。
 * - AI面接官の発話はブラウザ読み上げ(speechSynthesis)で音声化
 * - ユーザーの回答はマイク(webkitSpeechRecognition)で音声入力（非対応環境はテキスト入力）
 * - 終了時はサーバーで採点し、既存のフィードバックモーダル/保存フローへ渡す
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, PhoneOff, Send, Volume2, VolumeX } from "lucide-react";

type ChatMessage = { role: "user" | "model"; text: string };

export type ChatFeedback = {
  score: number;
  metrics: {
    voice_volume: number;
    response_quality: number;
    company_match: number;
    episodes: number;
    clarity: number;
  };
  good_points: string;
  advice: string;
  comment: string;
};

const INTERVIEW_DURATION_SEC = 10 * 60;

// webkitSpeechRecognition の最小型定義
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function createRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "ja-JP";
  rec.interimResults = true;
  rec.continuous = true;
  return rec;
}

export default function ChatInterview({
  sessionId,
  onFinish,
  onLimitReached,
  onExit,
}: {
  sessionId: string;
  onFinish: (feedback: ChatFeedback) => void;
  onLimitReached: () => void;
  onExit: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [interim, setInterim] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(INTERVIEW_DURATION_SEC);

  const messagesRef = useRef<ChatMessage[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);
  const ttsRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);
  const finishingRef = useRef(false);
  const speechSupported = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    ttsRef.current = ttsEnabled;
    if (!ttsEnabled && typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, [ttsEnabled]);

  // 自動スクロール
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, interim, waiting]);

  // タイマー
  useEffect(() => {
    const t = setInterval(() => setTimeLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (timeLeft === 0 && !finishingRef.current) {
      void finishInterview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const speak = useCallback((text: string) => {
    if (!ttsRef.current || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  }, []);

  const callChat = useCallback(
    async (history: ChatMessage[]) => {
      setWaiting(true);
      setError(null);
      try {
        const res = await fetch("/api/interview/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, messages: history }),
        });
        const data = await res.json();
        if (res.status === 403) {
          onLimitReached();
          return;
        }
        if (!res.ok || !data.reply) {
          throw new Error(data.error || "応答に失敗しました");
        }
        const next: ChatMessage[] = [...history, { role: "model", text: data.reply }];
        setMessages(next);
        speak(data.reply);
      } catch (e) {
        setError(e instanceof Error ? e.message : "通信に失敗しました");
      } finally {
        setWaiting(false);
      }
    },
    [sessionId, speak, onLimitReached]
  );

  // 面接開始（最初の質問を取得）
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    speechSupported.current = createRecognition() !== null;
    void callChat([]);
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    const rec = createRecognition();
    if (!rec) return;
    // AIの読み上げを止めてから聞き取る（エコー防止）
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    recognitionRef.current?.abort();
    recognitionRef.current = rec;
    listeningRef.current = true;
    setListening(true);
    setInterim("");

    rec.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) setInput((prev) => (prev + finalText).slice(0, 2000));
      setInterim(interimText);
    };
    rec.onerror = () => {
      listeningRef.current = false;
      setListening(false);
      setInterim("");
    };
    rec.onend = () => {
      // 話の途中で勝手に切れた場合は再開する
      if (listeningRef.current) {
        try { rec.start(); } catch { /* already started */ }
        return;
      }
      setListening(false);
      setInterim("");
    };
    try { rec.start(); } catch { /* already started */ }
  }, []);

  const sendAnswer = useCallback(async () => {
    const text = (input + interim).trim();
    if (!text || waiting || finishing) return;
    stopListening();
    setInput("");
    setInterim("");
    const next: ChatMessage[] = [...messagesRef.current, { role: "user", text }];
    setMessages(next);
    await callChat(next);
  }, [input, interim, waiting, finishing, stopListening, callChat]);

  const finishInterview = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    stopListening();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    try {
      const res = await fetch("/api/interview/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, messages: messagesRef.current }),
      });
      const data = await res.json();
      if (data.feedback) {
        onFinish(data.feedback as ChatFeedback);
      } else {
        setError(data.error || "採点できませんでした（回答が少なすぎる可能性があります）");
        finishingRef.current = false;
        setFinishing(false);
      }
    } catch {
      setError("採点リクエストに失敗しました。もう一度お試しください。");
      finishingRef.current = false;
      setFinishing(false);
    }
  }, [sessionId, onFinish, stopListening]);

  const formatTime = (sec: number) =>
    `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex h-[80vh] max-h-[720px] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white [background-image:var(--brand-grad)]">
            面
          </div>
          <div>
            <p className="text-sm font-bold text-ink">AI面接官</p>
            <p className="text-[11px] text-muted">会話モード</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            残り {formatTime(timeLeft)}
          </span>
          <button
            type="button"
            onClick={() => setTtsEnabled((v) => !v)}
            className="rounded-full border border-line p-2 text-slate-500 transition hover:bg-slate-50"
            aria-label={ttsEnabled ? "読み上げをオフ" : "読み上げをオン"}
            title={ttsEnabled ? "読み上げON" : "読み上げOFF"}
          >
            {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* メッセージ */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((m, i) =>
          m.role === "model" ? (
            <div key={i} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white [background-image:var(--brand-grad)]">
                面
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-800">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-3 text-sm leading-relaxed text-white">
                {m.text}
              </div>
            </div>
          )
        )}
        {waiting && (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white [background-image:var(--brand-grad)]">
              面
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        {error && (
          <p className="text-center text-xs font-semibold text-rose-500">{error}</p>
        )}
      </div>

      {/* 入力 */}
      <div className="border-t border-slate-100 px-4 py-3">
        {listening && (
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
            </span>
            聞き取り中… {interim && <span className="font-normal text-muted">「{interim}」</span>}
          </p>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            disabled={waiting || finishing}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition disabled:opacity-50 ${
              listening
                ? "bg-rose-500 text-white shadow-lg"
                : "border border-line bg-white text-slate-600 hover:border-brand"
            }`}
            aria-label={listening ? "音声入力を停止" : "音声で回答"}
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <textarea
            value={input + interim}
            onChange={(e) => { setInput(e.target.value); setInterim(""); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void sendAnswer();
              }
            }}
            placeholder="回答を話すか、入力してください"
            rows={2}
            className="input-field flex-1 resize-none"
            disabled={finishing}
          />
          <button
            type="button"
            onClick={() => void sendAnswer()}
            disabled={waiting || finishing || !(input + interim).trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-glow transition [background-image:var(--brand-grad)] disabled:opacity-50"
            aria-label="回答を送信"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            disabled={finishing}
            className="text-xs font-semibold text-muted transition hover:text-ink disabled:opacity-50"
          >
            設定に戻る
          </button>
          <button
            type="button"
            onClick={() => void finishInterview()}
            disabled={finishing || messages.filter((m) => m.role === "user").length === 0}
            className="flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-600 disabled:opacity-50"
          >
            {finishing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> 採点中...
              </>
            ) : (
              <>
                <PhoneOff className="h-3.5 w-3.5" /> 面接終了・採点
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
