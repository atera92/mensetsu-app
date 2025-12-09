// @ts-nocheck
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// 各種クライアントの準備
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const RESPONSE_TIME_SECONDS = 15; // AIの応答にかかった時間（利用時間として加算）
  
  // let宣言で初期化エラーを回避
  let userText = "聞き取り失敗"; 
  let aiText = "エラー";
  const dummyId = "00000000-0000-0000-0000-000000000000"; // 仮のユーザーID

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("❌ Supabaseの鍵が見つかりません！.env.localを確認してください。");
    return NextResponse.json({ error: "Env vars missing" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    
    // --- 【利用制限チェック】 ---
    const { data: usageData } = await supabase
        .from("daily_usages")
        .select("total_seconds")
        .eq("user_id", dummyId)
        .eq("usage_date", new Date().toISOString().split('T')[0])
        .maybeSingle();

    const currentSeconds = usageData?.total_seconds || 0;
    const remainingSeconds = 900 - currentSeconds;

    if (remainingSeconds <= 0) {
        const message = "申し訳ありません。本日の利用時間を使い切りました（15分）。続きは明日またお越しください。";
        const mp3Response = await openai.audio.speech.create({
            model: "tts-1", voice: "alloy", input: message,
        });
        const audioData = await mp3Response.arrayBuffer();
        
        return new NextResponse(audioData, {
            headers: { 
                'Content-Type': 'audio/mpeg', 
                'x-ai-text': encodeURIComponent(message),
                'x-remaining-seconds': '0'
            },
        });
    }

    // --- 【耳】Groqで文字起こし ---
    if (audioFile) {
        const buffer = await audioFile.arrayBuffer();
        const transcription = await groq.audio.transcriptions.create({
            file: new File([buffer], 'input.wav', { type: 'audio/wav' }),
            model: 'whisper-large-v3', language: 'ja', response_format: 'json',
        });
        userText = transcription.text;
    }
    
    // --- 【脳】GPT-4o miniで返答生成 ---
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "あなたは優しい面接官です。100文字以内で、相槌を打ちながら次の質問をしてください。" },
            { role: "user", content: userText }
        ],
    });
    aiText = completion.choices[0].message.content || "エラー";

    // --- 【記憶】Supabaseに保存と利用時間更新 ---
    const newTotalSeconds = currentSeconds + RESPONSE_TIME_SECONDS;

    // 1. 利用時間の更新（アップサート）
    await supabase.from("daily_usages").upsert({
        user_id: dummyId,
        usage_date: new Date().toISOString().split('T')[0],
        total_seconds: newTotalSeconds,
    });
    
    // 2. 会話ログの保存（面接ログ）
    await supabase.from("interviews").insert({
        user_id: dummyId,
        transcript: userText,
        feedback: aiText,
        score: 80 
    });

    // --- 【口】OpenAI TTSで音声合成 ---
    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: aiText,
    });
    
    const audioData = await mp3Response.arrayBuffer();
    
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'x-ai-text': encodeURIComponent(aiText),
        'x-remaining-seconds': String(900 - newTotalSeconds) // 残り時間を返す
      },
    });

  } catch (error) {
    console.error("💥 致命的なエラー:", error);
    // エラー時でもアプリが壊れないよう、エラーメッセージを音声で返す
    const message = "申し訳ありません。システムエラーが発生しました。";
    const mp3Response = await openai.audio.speech.create({
        model: "tts-1", voice: "alloy", input: message,
    });
    const audioData = await mp3Response.arrayBuffer();

    return new NextResponse(audioData, {
        headers: { 'Content-Type': 'audio/mpeg', 'x-ai-text': encodeURIComponent("システムエラー"), 'x-remaining-seconds': '900' },
    });
  }
}