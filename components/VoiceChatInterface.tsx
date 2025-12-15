// ファイル名: components/VoiceChatInterface.tsx
"use client";

import React, { useRef, useEffect } from 'react';
import { Mic, Square, Sparkles, User, Bot } from 'lucide-react';
// さっき作ったファイルを読み込みます
import { AudioVisualizer } from './AudioVisualizer';
import { useGeminiChat } from '../hooks/useGeminiChat';

const VoiceChatInterface = () => {
  // 作っておいた「頭脳」を使います
  const { isRecording, stream, messages, isStreaming, startRecording, stopRecording } = useGeminiChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // メッセージが増えたら自動で下にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isRecording]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white font-sans overflow-hidden">
      
      {/* ヘッダー（上の部分） */}
      <header className="flex items-center justify-between p-4 bg-gray-900/80 backdrop-blur-md border-b border-white/10 z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            AI Assistant
          </h1>
        </div>
      </header>

      {/* チャットエリア（真ん中） */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 opacity-50">
            <Bot size={48} />
            <p>マイクを押して話しかけてね</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            {/* アイコン */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-indigo-600' : 'bg-cyan-600'
              }`}
            >
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            {/* 吹き出し */}
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600/20 border border-indigo-500/30 rounded-tr-none'
                  : 'bg-gray-800/50 border border-gray-700 rounded-tl-none'
              }`}
            >
              {msg.text}
              {/* 文字が出ている間のカーソル点滅 */}
              {msg.role === 'ai' && idx === messages.length - 1 && isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-cyan-400 animate-pulse" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* 操作パネル（下の部分） */}
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-gray-950 via-gray-950 to-transparent pt-12 pb-6 px-4">
        <div className="max-w-md mx-auto space-y-4">
          
          {/* 波形表示エリア（録音中だけ出る） */}
          <div className={`transition-all duration-300 ease-in-out ${isRecording ? 'opacity-100 translate-y-0 h-32' : 'opacity-0 translate-y-4 h-0'}`}>
            <AudioVisualizer stream={stream} isRecording={isRecording} />
          </div>

          {/* マイクボタン */}
          <div className="flex items-center justify-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isStreaming} 
              className={`
                relative group flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-lg shadow-cyan-500/20
                ${isRecording 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-cyan-500 hover:bg-cyan-400'
                }
                ${isStreaming ? 'opacity-50 cursor-not-allowed grayscale' : ''}
              `}
            >
              {isRecording ? (
                <Square className="w-8 h-8 text-white fill-current" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceChatInterface;