/**
 * app/interview/page.tsx (完全修正版: 入力16kHz / 出力24kHz)
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, PhoneOff, ArrowLeft, Volume2, Trophy, AlertTriangle, Quote, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const SERVER_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";
const WS_TOKEN = process.env.NEXT_PUBLIC_WS_TOKEN;

// ★重要: ここで入出力のレートを明確に分けます
const INPUT_SAMPLE_RATE = 16000;  // マイクは16k (AIが聞き取りやすい)
const OUTPUT_SAMPLE_RATE = 24000; // スピーカーは24k (Gemini 2.5の仕様)
const INTERVIEW_DURATION_SEC = 10 * 60; // 10分タイマー

type FeedbackData = {
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

// レーダーチャート (変更なし)
const RadarChart = ({ metrics }: { metrics: FeedbackData['metrics'] }) => {
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const labels = ["声の大きさ", "適切な応答", "マッチ度", "エピソード", "わかりやすさ"];
  const dataValues = [
    metrics.voice_volume,
    metrics.response_quality,
    metrics.company_match,
    metrics.episodes,
    metrics.clarity
  ];
  const angleToRad = (angle: number) => (Math.PI / 180) * angle;
  const points = dataValues.map((value, i) => {
    const angle = i * (360 / 5) - 90;
    const r = (radius / 5) * value;
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
  const getLabelPos = (i: number) => {
      const angle = i * (360 / 5) - 90;
      const r = radius + 25;
      const x = center + r * Math.cos(angleToRad(angle));
      const y = center + r * Math.sin(angleToRad(angle));
      return { x, y };
  };
  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size + 80} height={size + 40} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {[5, 4, 3, 2, 1].map((level) => (
          <polygon key={level} points={getGridPoints(level)} fill="white" stroke="#e2e8f0" strokeWidth="1" fillOpacity={0.1} />
        ))}
        {Array.from({ length: 5 }).map((_, i) => {
            const angle = i * (360 / 5) - 90;
            const x = center + radius * Math.cos(angleToRad(angle));
            const y = center + radius * Math.sin(angleToRad(angle));
            return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#e2e8f0" />;
        })}
        <polygon points={points} fill="rgba(37, 99, 235, 0.3)" stroke="#2563eb" strokeWidth="2" />
        {dataValues.map((value, i) => {
            const angle = i * (360 / 5) - 90;
            const r = (radius / 5) * value;
            const x = center + r * Math.cos(angleToRad(angle));
            const y = center + r * Math.sin(angleToRad(angle));
            return <circle key={i} cx={x} cy={y} r="4" fill="#2563eb" />;
        })}
        {labels.map((label, i) => {
            const { x, y } = getLabelPos(i);
            return <text key={i} x={x} y={y} fontSize="10" textAnchor="middle" dominantBaseline="middle" fill="#64748b" className="font-bold">{label}</text>;
        })}
      </svg>
    </div>
  );
};

export default function InterviewPage() {
  const router = useRouter();

  // ✅ ブラウザ側のSupabaseクライアント（セッション保持あり）
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current!;

  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState("準備完了");
  const [volume, setVolume] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error" | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // 10分タイマー
  const [timeLeftSec, setTimeLeftSec] = useState<number>(INTERVIEW_DURATION_SEC);

  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);
  const pendingChunksRef = useRef<string[]>([]);
  const pendingBytesRef = useRef(0);
  const isFlushingRef = useRef(false);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoFinishedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(false);
  const isConnectingRef = useRef(false);
  const hasStartedRef = useRef(false);
  const feedbackRef = useRef<FeedbackData | null>(null);
  const isAnalyzingRef = useRef(false);
  const MAX_RECONNECTS = 5;
  const MAX_QUEUED_BYTES = 12 * 1024 * 1024;
  const BUFFERED_AMOUNT_LIMIT = 2 * 1024 * 1024;

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      disconnectForce();
    };
  }, []);
 
  useEffect(() => {
    feedbackRef.current = feedback;
  }, [feedback]);

  useEffect(() => {
    isAnalyzingRef.current = isAnalyzing;
  }, [isAnalyzing]);

  // ✅ ログインしていないユーザーは /login に戻す（OAuth直後などはセッション反映が遅いので少し待つ）
  useEffect(() => {
    let cancelled = false;

    const checkSession = async (attempt = 0) => {
      const { data, error } = await supabase.auth.getSession();
      const session = data.session;

      // セッションがあればOK
      if (!cancelled && !error && session) return;

      // 直後はまだセッションが反映されていないことがあるので少しリトライ
      if (!cancelled && attempt < 5) {
        setTimeout(() => checkSession(attempt + 1), 300);
        return;
      }

      // 最終的にセッションが無ければログインへ
      if (!cancelled) {
        router.replace("/login");
      }
    };

    checkSession();

    // 後からセッションが入るケースに備えて監視
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) {
        // セッションが復活したのでOK
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  const saveToSupabase = async (data: FeedbackData) => {
    setSaveStatus("saving");
    try {
      // ✅ セッションからユーザーIDを取得（安定）
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const session = sessionData.session;
      if (!session?.user) throw new Error("ログインしていないため保存できません");

      // ✅ user_id を一緒に保存
      const { error } = await supabase
        .from("interviews")
        .insert([
          {
            user_id: session.user.id,
            score: data.score,
            good_points: data.good_points,
            advice: data.advice,
            comment: data.comment,
            metrics: data.metrics,
          },
        ]);

      if (error) throw error;
      setSaveStatus("saved");
    } catch (err) {
      console.error("Supabase save error:", err);
      setSaveStatus("error");
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (reset = true) => {
    clearTimer();
    if (reset) {
      autoFinishedRef.current = false;
      setTimeLeftSec(INTERVIEW_DURATION_SEC);
    }
    timerRef.current = setInterval(() => {
      setTimeLeftSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
  };

  const resetReconnectState = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    setIsReconnecting(false);
  };

  const clearPendingChunks = () => {
    pendingChunksRef.current = [];
    pendingBytesRef.current = 0;
    isFlushingRef.current = false;
  };

  const ensureStream = async () => {
    if (streamRef.current) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    streamRef.current = stream;
    return stream;
  };

  const scheduleReconnect = async () => {
    if (!shouldReconnectRef.current) return;
    if (reconnectTimerRef.current) return;
    if (reconnectAttemptsRef.current >= MAX_RECONNECTS) {
      setIsReconnecting(false);
      setStatus("接続が切れました。再接続できませんでした");
      shouldReconnectRef.current = false;
      clearPendingChunks();
      return;
    }
    const attempt = reconnectAttemptsRef.current + 1;
    const delayMs = Math.min(1000 * 2 ** (attempt - 1), 10000);
    setIsReconnecting(true);
    setStatus(`再接続中... (${attempt}/${MAX_RECONNECTS})`);
    reconnectTimerRef.current = setTimeout(async () => {
      reconnectTimerRef.current = null;
      reconnectAttemptsRef.current = attempt;
      try {
        const stream = await ensureStream();
        openSocket(stream, true);
      } catch (error) {
        console.error(error);
        scheduleReconnect();
      }
    }, delayMs);
  };

  const openSocket = (stream: MediaStream, isReconnect = false) => {
    if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    const ws = new WebSocket(buildWsUrl());
    socketRef.current = ws;

    ws.onopen = async () => {
      isConnectingRef.current = false;
      setIsConnected(true);
      setIsReconnecting(false);
      flushPendingChunks();
      if (!hasStartedRef.current) {
        setStatus("面接開始");
        startTimer(true);
        await startRecording(stream);
        hasStartedRef.current = true;
      } else {
        setStatus(isReconnect ? "通話再開" : "面接開始");
        startTimer(false);
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data.toString());
        if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
          const base64Audio = data.serverContent.modelTurn.parts[0].inlineData.data;
          playAudio(base64Audio);
        }
        if (data.type === "FEEDBACK_RESULT") {
          const resultData = data.data;
          setFeedback(resultData);
          setIsAnalyzing(false);
          disconnectForce();
          saveToSupabase(resultData);
        }
      } catch (e) {}
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      isConnectingRef.current = false;
      clearTimer();
      setIsConnected(false);
      if (shouldReconnectRef.current && !isAnalyzingRef.current && !feedbackRef.current) {
        scheduleReconnect();
        return;
      }
      if (!isAnalyzingRef.current && !feedbackRef.current) setStatus("通話終了");
    };
  };

  const connect = async () => {
    try {
      setFeedback(null);
      setSaveStatus(null);
      setStatus("接続中...");
      resetReconnectState();
      shouldReconnectRef.current = true;
      ensureSessionId();
      const stream = await ensureStream();
      openSocket(stream);
    } catch (error) {
      console.error(error);
      setStatus("エラー");
    }
  };

  const finishInterview = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
        clearTimer();
        setStatus("AIが採点中..."); setIsAnalyzing(true);
        shouldReconnectRef.current = false;
        resetReconnectState();
        clearPendingChunks();
        socketRef.current.send(JSON.stringify({ type: "FINISH_INTERVIEW" }));
        stopRecording(true);
    } else { disconnectForce(); }
  };

  const disconnectForce = () => {
    shouldReconnectRef.current = false;
    resetReconnectState();
    clearTimer();
    autoFinishedRef.current = false;
    setTimeLeftSec(INTERVIEW_DURATION_SEC);
    hasStartedRef.current = false;
    sessionIdRef.current = null;
    clearPendingChunks();
    if (socketRef.current) { socketRef.current.close(); socketRef.current = null; }
    stopRecording(true);
    setIsConnected(false);
  };

  useEffect(() => {
    if (!isConnected) return;
    if (isAnalyzing) return;
    if (timeLeftSec === 0 && !autoFinishedRef.current) {
      autoFinishedRef.current = true;
      setStatus("時間になりました。採点します...");
      finishInterview();
    }
  }, [timeLeftSec, isConnected, isAnalyzing]);

  const startRecording = async (stream: MediaStream) => {
    if (audioContextRef.current) return;
    // ★ここが修正点: マイク入力は必ず 16000Hz に強制する
    // これをしないと、AIがあなたの声を認識できません
    const audioContext = new window.AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    
    audioContextRef.current = audioContext;
    nextStartTimeRef.current = audioContext.currentTime;

    const blob = new Blob([workletCode], { type: "application/javascript" });
    const workletUrl = URL.createObjectURL(blob);
    await audioContext.audioWorklet.addModule(workletUrl);

    const source = audioContext.createMediaStreamSource(stream);
    const processor = new AudioWorkletNode(audioContext, "recorder-worklet");
    source.connect(processor); processor.connect(audioContext.destination);
    audioWorkletNodeRef.current = processor;
    processor.port.onmessage = (event) => {
      const audioData = event.data;
      const vol = Math.max(...audioData.map(Math.abs));
      setVolume(Math.min(vol * 5, 1));
      
      // 音量が出ているかログで確認
      if (vol > 0.01) console.log("Mic Input Volume:", vol);

      const payload = JSON.stringify({
        realtime_input: {
          media_chunks: [{ mime_type: "audio/pcm", data: float32ToBase64(audioData) }],
        },
      });
      sendOrQueue(payload);
    };
  };

  const stopRecording = (stopTracks = false) => {
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    audioWorkletNodeRef.current = null;
    if (stopTracks && streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const ensureSessionId = () => {
    if (sessionIdRef.current) return;
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      sessionIdRef.current = crypto.randomUUID();
      return;
    }
    sessionIdRef.current = `sid-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const buildWsUrl = () => {
    ensureSessionId();
    const url = new URL(SERVER_URL);
    url.searchParams.set("sid", sessionIdRef.current!);
    if (WS_TOKEN) {
      url.searchParams.set("token", WS_TOKEN);
    }
    return url.toString();
  };

  const flushPendingChunks = () => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (pendingChunksRef.current.length === 0) {
      isFlushingRef.current = false;
      return;
    }
    isFlushingRef.current = true;
    const sendBatch = () => {
      const currentWs = socketRef.current;
      if (!currentWs || currentWs.readyState !== WebSocket.OPEN) {
        isFlushingRef.current = false;
        return;
      }
      while (pendingChunksRef.current.length > 0) {
        if (currentWs.bufferedAmount > BUFFERED_AMOUNT_LIMIT) {
          flushTimerRef.current = setTimeout(sendBatch, 50);
          return;
        }
        const msg = pendingChunksRef.current.shift();
        if (!msg) break;
        pendingBytesRef.current -= msg.length;
        currentWs.send(msg);
      }
      isFlushingRef.current = false;
    };
    sendBatch();
  };

  const sendOrQueue = (payload: string) => {
    const ws = socketRef.current;
    if (isFlushingRef.current || !ws || ws.readyState !== WebSocket.OPEN) {
      pendingChunksRef.current.push(payload);
      pendingBytesRef.current += payload.length;
      while (pendingBytesRef.current > MAX_QUEUED_BYTES && pendingChunksRef.current.length > 0) {
        const dropped = pendingChunksRef.current.shift();
        if (!dropped) break;
        pendingBytesRef.current -= dropped.length;
      }
      return;
    }
    ws.send(payload);
  };

  const playAudio = async (base64String: string) => {
    try {
      if (!audioContextRef.current) return;
      
      const binaryString = window.atob(base64String);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
      const int16Array = new Int16Array(bytes.buffer);
      
      // 出力バッファは 24000Hz で作る（ブラウザが自動でリサンプリングして再生してくれる）
      const audioBuffer = audioContextRef.current.createBuffer(1, int16Array.length, OUTPUT_SAMPLE_RATE);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16Array.length; i++) { channelData[i] = int16Array[i] / 32768.0; }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      const currentTime = audioContextRef.current.currentTime;
      if (nextStartTimeRef.current < currentTime) {
          nextStartTimeRef.current = currentTime;
      }
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;

    } catch (e) {
        console.error(e);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center relative">
        <div className="bg-white p-10 rounded-3xl shadow-xl flex flex-col items-center max-w-md w-full border border-slate-100 z-10">
            <Link href="/" className="self-start text-slate-400 hover:text-slate-600 mb-6 flex items-center text-sm font-bold"><ArrowLeft className="w-4 h-4 mr-1" /> TOPへ戻る</Link>

            {isConnected && !isAnalyzing && (
              <div className="mb-4 w-full flex items-center justify-center">
                <div className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-bold">
                  残り時間: <span className="text-slate-900">{formatTime(timeLeftSec)}</span>
                </div>
              </div>
            )}
            
            <div className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 mb-8 ${isConnected ? "bg-blue-50 shadow-inner" : "bg-slate-100"}`}>
                {isConnected && !isAnalyzing && <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-pulse" style={{ transform: `scale(${1 + volume})` }}></div>}
                {isAnalyzing ? <Loader2 className="w-20 h-20 text-blue-600 animate-spin" /> : isConnected ? <Volume2 className="w-20 h-20 text-blue-600" /> : <Mic className="w-20 h-20 text-slate-300" />}
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">{status}</h2>
            <p className="text-slate-500 mb-8 text-center text-sm">{isConnected ? "音声会話中" : "ボタンを押して面接を開始"}</p>

            {!isConnected ? (
                isReconnecting ? (
                  <button disabled className="w-full py-4 bg-slate-400 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 再接続中...
                  </button>
                ) : (
                  <button onClick={connect} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center"><Mic className="w-5 h-5 mr-2" /> 面接を始める</button>
                )
            ) : (
                <button onClick={finishInterview} disabled={isAnalyzing} className={`w-full py-4 ${isAnalyzing ? "bg-slate-400" : "bg-red-500 hover:bg-red-600"} text-white rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center`}><PhoneOff className="w-5 h-5 mr-2" /> {isAnalyzing ? "採点中..." : "面接終了・採点"}</button>
            )}
        </div>

        {/* 結果表示モーダル */}
        {feedback && (
            <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        {saveStatus === "saving" && <span className="text-slate-400 text-xs flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1"/> 保存中...</span>}
                        {saveStatus === "saved" && <span className="text-green-600 text-xs flex items-center font-bold"><Save className="w-3 h-3 mr-1"/> 保存完了</span>}
                        {saveStatus === "error" && <span className="text-red-500 text-xs font-bold">保存失敗</span>}
                    </div>
                    <div className="text-center mb-6">
                        <p className="text-sm font-bold text-slate-400 tracking-widest">TOTAL SCORE</p>
                        <h2 className="text-6xl font-black text-blue-600">{feedback.score}<span className="text-2xl text-slate-300 ml-1">/100</span></h2>
                    </div>
                    <div className="mb-8 flex justify-center">
                        <RadarChart metrics={feedback.metrics} />
                    </div>
                    <div className="space-y-4 mb-8">
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                            <h3 className="font-bold text-green-800 flex items-center gap-2 mb-1"><Trophy className="w-4 h-4" /> 良かった点</h3>
                            <p className="text-green-900 text-sm leading-relaxed">{feedback.good_points}</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4" /> 改善アドバイス</h3>
                            <p className="text-orange-900 text-sm leading-relaxed">{feedback.advice}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-1"><Quote className="w-4 h-4" /> 総評</h3>
                            <p className="text-slate-600 text-sm">{feedback.comment}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setFeedback(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold">閉じる</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

// シンプルな録音機能（ノイズゲートなし・そのまま送信）
const workletCode = `
class RecorderWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.cursor = 0;
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channelData = input[0];
    
    // バッファにデータを詰めて送信するだけ
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.cursor++] = channelData[i];
      if (this.cursor >= this.bufferSize) {
        this.port.postMessage(this.buffer.slice());
        this.cursor = 0;
      }
    }
    return true;
  }
}
registerProcessor("recorder-worklet", RecorderWorklet);
`;

function float32ToBase64(f){const i=new Int16Array(f.length);for(let j=0;j<f.length;j++){const s=Math.max(-1,Math.min(1,f[j]));i[j]=s<0?s*0x8000:s*0x7FFF;}let b="";const y=new Uint8Array(i.buffer);for(let k=0;k<y.byteLength;k++){b+=String.fromCharCode(y[k]);}return window.btoa(b);}
