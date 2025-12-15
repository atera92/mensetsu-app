// ファイル名: hooks/useGeminiChat.ts
"use client";

import { useState, useRef, useCallback } from 'react';

export const useGeminiChat = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      
      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('マイクのエラー:', error);
      alert('マイクの使用を許可してください');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !stream) return;

    mediaRecorderRef.current.stop();
    stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsRecording(false);

    setTimeout(async () => {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setMessages(prev => [...prev, { role: 'user', text: "（音声を送信しました...）" }]);
      await handleGeminiResponse(audioBlob);
    }, 200);
  }, [stream]);

  // ★ここを修正しました：AIの返答処理
  const handleGeminiResponse = async (audioBlob: Blob) => {
    setIsStreaming(true);
    
    // 仮の返答メッセージ
    const mockText = "こんにちは！音声読み上げ機能を追加しました。これで私の声が聞こえるはずです。";
    
    // 1. まず喋らせる（ブラウザの機能を使います）
    const uttr = new SpeechSynthesisUtterance(mockText);
    uttr.lang = "ja-JP"; // 日本語に設定
    window.speechSynthesis.speak(uttr);

    // 2. 画面に文字を一文字ずつ出す
    setMessages(prev => [...prev, { role: 'ai', text: "" }]);
    const chunks = mockText.split(""); 

    let currentText = "";
    for (const char of chunks) {
      await new Promise(resolve => setTimeout(resolve, 50));
      currentText += char;
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'ai', text: currentText };
        return newMessages;
      });
    }

    setIsStreaming(false);
  };

  return {
    isRecording,
    stream,
    messages,
    isStreaming,
    startRecording,
    stopRecording
  };
};