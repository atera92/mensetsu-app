"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, ArrowLeft, Loader2, Gauge } from "lucide-react";
import Link from "next/link";

const TOTAL_TIME_SECONDS = 900; // 15分

export default function InterviewPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("待機中");
  const [lastAiMessage, setLastAiMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(TOTAL_TIME_SECONDS); // 残り時間
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 初期ロード時に、残り時間の初期値を取得する処理（今回は900秒で固定）
  useEffect(() => {
    setRemainingSeconds(TOTAL_TIME_SECONDS); 
  }, []);

  // 時間を分と秒に変換するヘルパー
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}分 ${sec < 10 ? '0' : ''}${sec}秒`;
  };

  // マイク開始
  const startRecording = async () => {
    if (remainingSeconds <= 0) {
        alert("本日の利用時間を使い切りました。");
        return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        handleSendAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus("録音中...（話し終わったら停止ボタン）");
    } catch (err) {
      alert("マイクの使用を許可してください");
    }
  };

  // マイク停止
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // APIに音声を送る関数
  const handleSendAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setStatus("AIが考えています...");

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      // ローカル環境のAPIを呼び出し
      const response = await fetch("/api/interview/chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("通信エラー");

      // 1. 残り時間をヘッダーから取得
      const remainingHeader = response.headers.get("x-remaining-seconds");
      if (remainingHeader) {
        setRemainingSeconds(parseInt(remainingHeader)); // 残り時間を更新
      }

      // 2. AIのテキストを取得
      const aiTextHeader = response.headers.get("x-ai-text");
      if (aiTextHeader) {
        setLastAiMessage(decodeURIComponent(aiTextHeader));
      }

      // 3. 音声再生
      const audioBlobResponse = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlobResponse);
      const audio = new Audio(audioUrl);
      
      setStatus("AIが話しています...");
      audio.play();
      
      audio.onended = () => {
        setIsProcessing(false);
        // 残り時間チェック
        if (parseInt(remainingHeader || "1") <= 0) {
            setStatus("利用時間終了");
            setLastAiMessage("🤖 本日の利用時間を使い切りました。");
        } else {
            setStatus("待機中（あなたの番です）");
        }
      };

    } catch (error) {
      console.error(error);
      setStatus("エラーが発生しました");
      setIsProcessing(false);
    }
  };
  
  // ガソリンメーターの計算
  const percentage = (remainingSeconds / TOTAL_TIME_SECONDS) * 100;
  const meterColor = percentage > 50 ? 'bg-green-500' : percentage > 20 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start p-4 pt-10">
      <div className="max-w-md w-full text-center space-y-10">
        
        {/* ヘッダーとメーター */}
        <div className="w-full flex justify-between items-center mb-6 border-b pb-4">
            <Link href="/" className="flex items-center text-slate-500 hover:text-blue-600">
                <ArrowLeft className="w-5 h-5 mr-1" />
                戻る
            </Link>

            {/* ガソリンメーター */}
            <div className="flex flex-col items-end">
                <div className="flex items-center text-sm font-medium text-slate-600">
                    <Gauge className="w-4 h-4 mr-1 text-blue-600" />
                    残り時間 (Light Plan)
                </div>
                <div className="w-40 bg-slate-200 rounded-full h-2.5 relative">
                    <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${meterColor}`} 
                        style={{ width: `${Math.max(0, percentage)}%` }}
                    ></div>
                </div>
                <p className={`text-xs mt-1 ${percentage <= 20 ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                    {formatTime(remainingSeconds)}
                </p>
            </div>
        </div>


        {/* ステータスとAIの言葉 */}
        <div className="space-y-4 h-32 flex flex-col justify-center">
          <h2 className={`text-2xl font-bold transition-colors ${
            status.includes("録音") ? "text-red-500" : 
            status.includes("話して") ? "text-blue-500" : "text-slate-700"
          }`}>
            {status}
          </h2>
          {lastAiMessage && (
            <p className="text-slate-600 bg-white p-4 rounded-xl shadow-sm animate-fade-in text-left border">
              🤖 "{lastAiMessage}"
            </p>
          )}
        </div>

        {/* ボタン */}
        <div className="flex justify-center mt-12">
            {isProcessing ? (
                <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center animate-spin">
                    <Loader2 className="w-10 h-10 text-slate-500" />
                </div>
            ) : (
                <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 ${
                    isRecording 
                    ? "bg-red-500 hover:bg-red-600 text-white" 
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                disabled={remainingSeconds <= 0}
                >
                {isRecording ? (
                    <Square className="w-10 h-10 fill-current" />
                ) : (
                    <Mic className="w-10 h-10" />
                )}
                </button>
            )}
        </div>
        
        <p className="text-slate-400 text-sm">
          {isRecording ? "タップして停止" : isProcessing ? "通信中..." : "タップして会話を開始"}
        </p>

      </div>
    </div>
  );
}