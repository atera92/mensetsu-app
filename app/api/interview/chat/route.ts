import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  console.log('🚀 API呼び出し開始！');

  // 1. 鍵のチェック
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      '❌ Supabaseの鍵が見つかりません！.env.localを確認してください。'
    );
    return NextResponse.json({ error: 'Env vars missing' }, { status: 500 });
  } else {
    console.log('🔑 鍵はありました。URL:', supabaseUrl);
  }

  // クライアント準備
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      console.error('❌ 音声ファイルが届いていません');
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    // --- 【耳】 ---
    console.log('👂 音声認識スタート...');
    const buffer = await audioFile.arrayBuffer();
    const transcription = await groq.audio.transcriptions.create({
      file: new File([buffer], 'input.wav', { type: 'audio/wav' }),
      model: 'whisper-large-v3',
      language: 'ja',
      response_format: 'json',
    });
    const userText = transcription.text;
    console.log('✅ 認識完了:', userText);

    // --- 【脳】 ---
    console.log('🧠 思考スタート...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたは優しい面接官です。100文字以内で返答してください。',
        },
        { role: 'user', content: userText },
      ],
    });
    const aiText = completion.choices[0].message.content || 'エラー';
    console.log('✅ 思考完了:', aiText);

    // --- 【記憶】（ここが問題の場所！） ---
    console.log('💾 データベース保存トライ...');
    const dummyId = '00000000-0000-0000-0000-000000000000';

    // 1. プロフィール保存（エラーチェック付き）
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: dummyId, plan_type: 'light' });

    if (profileError) {
      console.error('❌ プロフィール保存失敗:', profileError); // ★ここに出るはず！
    } else {
      console.log('✅ プロフィール保存OK');
    }

    // 2. 会話ログ保存（エラーチェック付き）
    const { data, error: interviewError } = await supabase
      .from('interviews')
      .insert({
        user_id: dummyId,
        transcript: userText,
        feedback: aiText,
        score: 80,
      })
      .select(); // selectをつけると保存したデータを返してくれます

    if (interviewError) {
      console.error('❌ 面接ログ保存失敗:', interviewError); // ★またはここ！
    } else {
      console.log('✅ 面接ログ保存OK！データ:', data);
    }

// --- 【口】 ---
console.log("👄 音声合成スタート...");
const mp3Response = await openai.audio.speech.create({
  model: "tts-1",
  voice: "alloy",
  input: aiText,
});

// 【修正点】BufferというNode.js専用の形ではなく、世界標準のArrayBufferのまま渡します
const audioData = await mp3Response.arrayBuffer();

return new NextResponse(audioData, {
  headers: { 
    'Content-Type': 'audio/mpeg', 
    'x-ai-text': encodeURIComponent(aiText) 
  },
});

} catch (error: any) {
console.error("💥 致命的なエラー:", error);
return NextResponse.json({ error: error.message }, { status: 500 });
}
}