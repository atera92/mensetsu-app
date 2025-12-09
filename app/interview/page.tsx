'use client';

import { useState, useRef } from 'react';
import { Mic, Square, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function InterviewPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // AI考え中フラグ
  const [status, setStatus] = useState('待機中');
  const [lastAiMessage, setLastAiMessage] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // マイク開始
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/wav',
        });
        handleSendAudio(audioBlob); // 録音が終わったら送信！
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('録音中...（話し終わったら停止ボタン）');
    } catch (err) {
      alert('マイクを許可してください');
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
    setStatus('AIが考えています...');

    try {
      // 1. フォームデータを作る
      const formData = new FormData();
      formData.append('audio', audioBlob);

      // 2. さっき作ったAPIに送信！
      const response = await fetch('/api/interview/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('通信エラー');

      // 3. 返ってきた音声（MP3）を再生する
      const audioBlobResponse = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlobResponse);
      const audio = new Audio(audioUrl);

      // おまけ：ヘッダーからAIのテキストを取り出す
      const aiTextHeader = response.headers.get('x-ai-text');
      if (aiTextHeader) {
        setLastAiMessage(decodeURIComponent(aiTextHeader));
      }

      setStatus('AIが話しています...');
      audio.play();

      audio.onended = () => {
        setStatus('待機中（あなたの番です）');
        setIsProcessing(false);
      };
    } catch (error) {
      console.error(error);
      setStatus('エラーが発生しました');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <Link
          href="/"
          className="flex items-center text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          戻る
        </Link>
      </div>

      <div className="max-w-md w-full text-center space-y-12">
        {/* ステータスとAIの言葉 */}
        <div className="space-y-4 h-32 flex flex-col justify-center">
          <h2
            className={`text-2xl font-bold transition-colors ${
              status.includes('録音')
                ? 'text-red-500'
                : status.includes('話して')
                ? 'text-blue-500'
                : 'text-slate-700'
            }`}
          >
            {status}
          </h2>
          {lastAiMessage && (
            <p className="text-slate-600 bg-white p-4 rounded-xl shadow-sm animate-fade-in">
              🤖 "{lastAiMessage}"
            </p>
          )}
        </div>

        {/* ボタン */}
        <div className="flex justify-center">
          {isProcessing ? (
            <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center animate-spin">
              <Loader2 className="w-10 h-10 text-slate-500" />
            </div>
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all transform hover:scale-105 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
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
          {isRecording
            ? 'タップして停止'
            : isProcessing
            ? '通信中...'
            : 'タップして会話を開始'}
        </p>
      </div>
    </div>
  );
}
