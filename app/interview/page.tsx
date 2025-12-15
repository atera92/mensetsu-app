"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, PhoneOff, ArrowLeft, Loader2, Volume2 } from "lucide-react";
import Link from "next/link";

// ----------------------------------------------------------------------------
// 設定値（ここはいじらない）
// ----------------------------------------------------------------------------
const SERVER_URL = "ws://localhost:8080";
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

// ----------------------------------------------------------------------------
// メイン画面のプログラム
// ----------------------------------------------------------------------------
export default function InterviewPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState("準備完了");
  const [volume, setVolume] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => disconnect();
  }, []);

  const connect = async () => {
    try {
      setStatus("接続中...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // ここを修正しました（余分な記述を削除）
      const ws = new WebSocket(SERVER_URL);
      socketRef.current = ws;

      ws.onopen = async () => {
        setIsConnected(true);
        setStatus("面接開始！話しかけてください");
        await startRecording(stream, ws);
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
          const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
          playAudio(base64Audio);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStatus("通話終了");
        stopRecording();
      };

    } catch (error) {
      console.error(error);
      setStatus("エラー：マイクまたはサーバーに接続できません");
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    stopRecording();
    setIsConnected(false);
    setStatus("通話終了");
  };

  const startRecording = async (stream: MediaStream, ws: WebSocket) => {
    const audioContext = new window.AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    audioContextRef.current = audioContext;

    await audioContext.audioWorklet.addModule(
      "data:text/javascript;base64," + btoa(workletCode)
    );

    const source = audioContext.createMediaStreamSource(stream);
    const processor = new AudioWorkletNode(audioContext, "recorder-worklet");
    
    source.connect(processor);
    processor.connect(audioContext.destination);
    audioWorkletNodeRef.current = processor;

    processor.port.onmessage = (event) => {
      const audioData = event.data;
      
      const vol = Math.max(...audioData.map(Math.abs));
      setVolume(Math.min(vol * 5, 1));

      const base64Data = float32ToBase64(audioData);

      if (ws.readyState === WebSocket.OPEN) {
        const msg = {
          realtime_input: {
            media_chunks: [{
              mime_type: "audio/pcm",
              data: base64Data
            }]
          }
        };
        ws.send(JSON.stringify(msg));
      }
    };
  };

  const stopRecording = () => {
    if (audioContextRef.current) audioContextRef.current.close();
    audioContextRef.current = null;
    if (audioWorkletNodeRef.current) audioWorkletNodeRef.current = null;
  };

  const playAudio = async (base64String: string) => {
    try {
      if (!audioContextRef.current) return;
      
      const binaryString = window.atob(base64String);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16Array = new Int16Array(bytes.buffer);
      
      const audioBuffer = audioContextRef.current.createBuffer(1, int16Array.length, OUTPUT_SAMPLE_RATE);
      const channelData = audioBuffer.getChannelData(0);
      
      for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768.0;
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = 0.9;
      source.connect(audioContextRef.current.destination);

      const currentTime = audioContextRef.current.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }
      
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration / 0.9;

    } catch (e) {
      console.error("再生エラー", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-blue-600 flex items-center">
            <ArrowLeft className="w-5 h-5 mr-1" /> 戻る
          </Link>
          <span className="text-sm font-bold text-slate-400">GEMINI LIVE DEMO</span>
        </div>

        <div className="flex flex-col items-center justify-center py-10 space-y-6">
          <div className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ${isConnected ? "bg-blue-50 shadow-2xl" : "bg-slate-100"}`}>
            {isConnected && (
               <div 
                 className="absolute inset-0 rounded-full bg-blue-200 opacity-50 transition-all duration-75"
                 style={{ transform: `scale(${1 + volume})` }}
               ></div>
            )}
            
            {isConnected ? (
                <Volume2 className={`w-16 h-16 text-blue-600 transition-opacity ${volume > 0.1 ? "opacity-100" : "opacity-50"}`} />
            ) : (
                <Mic className="w-16 h-16 text-slate-300" />
            )}
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-700">{status}</h2>
            <p className="text-sm text-slate-500">
                {isConnected ? "AIが聞いています..." : "ボタンを押して開始"}
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          {!isConnected ? (
            <button
              onClick={connect}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-lg shadow-lg flex items-center space-x-2 transition-transform active:scale-95"
            >
              <Mic className="w-5 h-5" />
              <span>面接を始める</span>
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-lg shadow-lg flex items-center space-x-2 transition-transform active:scale-95"
            >
              <PhoneOff className="w-5 h-5" />
              <span>通話を切る</span>
            </button>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm text-xs text-slate-500 border border-slate-100">
            <p>※ ハウリング防止のため、イヤホン推奨です。</p>
            <p>※ Gemini 2.5 Flashを使用。会話内容は録音されません。</p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 裏方の便利ツール
// ----------------------------------------------------------------------------

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

function float32ToBase64(float32Array: Float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  let binary = "";
  const bytes = new Uint8Array(int16Array.buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}