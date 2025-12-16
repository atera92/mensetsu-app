/**
 * server.ts (5段階評価・レーダーチャート対応)
 */
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Buffer } from 'node:buffer';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌ エラー: APIキーが見つかりません");
  process.exit(1);
}

const HOST = "generativelanguage.googleapis.com";
const PATH = "/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";
const GEMINI_URL = `wss://${HOST}${PATH}?key=${API_KEY}`;

// モデル設定
const TALK_MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025";
const JUDGE_MODEL = "gemini-2.0-flash-exp";

const genAI = new GoogleGenerativeAI(API_KEY);
const judgeModel = genAI.getGenerativeModel({ model: JUDGE_MODEL });

const wss = new WebSocketServer({ port: 8080 });

console.log(`📞 面接サーバー(レーダーチャート対応)が起動しました`);

wss.on('connection', (clientWs: WebSocket) => {
  console.log("👤 接続");
  const geminiWs = new WebSocket(GEMINI_URL);
  let recordingBuffer: Buffer[] = [];

  const initialSetupMessage = {
    setup: {
      model: TALK_MODEL,
      generationConfig: { responseModalities: ["AUDIO"] }
    }
  };

  const systemPrompt = `
【重要設定】
言語: 日本語
役割: 厳格な採用担当「佐藤」
ルール: 
- 必ず日本語で、落ち着いたトーンで話すこと。
- 候補者の発言に対しては、必ず「なるほど」「承知しました」などの相槌を打ってから次の質問に移ること。
`;

  geminiWs.on('open', () => {
    geminiWs.send(JSON.stringify(initialSetupMessage));
    geminiWs.send(JSON.stringify({
        clientContent: { turns: [{ role: "user", parts: [{ text: systemPrompt }] }], turnComplete: true }
    }));
  });

  geminiWs.on('message', (data: any) => {
    try {
        const msg = JSON.parse(data.toString());
        if (msg.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
            const audioData = msg.serverContent.modelTurn.parts[0].inlineData.data;
            if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data.toString());
            recordingBuffer.push(Buffer.from(audioData, 'base64'));
        }
    } catch(e) {}
  });

  clientWs.on('message', (data: any) => {
    try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "FINISH_INTERVIEW") {
            console.log("🛑 面接終了。採点を開始します...");
            generateScore(recordingBuffer).then(feedback => {
                if (feedback && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({ type: "FEEDBACK_RESULT", data: feedback }));
                }
            });
            return;
        }

        if (msg.realtime_input?.media_chunks) {
            const audioData = msg.realtime_input.media_chunks[0].data;
            recordingBuffer.push(Buffer.from(audioData, 'base64'));
            if (geminiWs.readyState === WebSocket.OPEN) geminiWs.send(data);
        }
    } catch (e) {
        if (geminiWs.readyState === WebSocket.OPEN) geminiWs.send(data);
    }
  });

  // --- 採点機能 (5段階評価を追加) ---
  async function generateScore(audioBuffer: Buffer[]) {
      try {
          if (audioBuffer.length === 0) return null;
          
          const fullAudio = Buffer.concat(audioBuffer);
          const wavBuffer = addWavHeader(fullAudio, 24000, 1, 16);
          const base64Audio = wavBuffer.toString('base64');

          // ★ここを変更: 5つの指標をJSONスキーマに追加
          const prompt = `
あなたはベテラン面接官です。以下の音声は「模擬面接の録音データ」です。
この候補者のパフォーマンスを評価し、以下のJSON形式で出力してください。
**必ず日本語で出力すること。**

{
  "score": 0〜100の整数,
  "metrics": {
    "voice_volume": 1〜5の整数 (声の大きさ),
    "response_quality": 1〜5の整数 (適切な応答),
    "company_match": 1〜5の整数 (会社とのマッチ度),
    "episodes": 1〜5の整数 (エピソードの具体性),
    "clarity": 1〜5の整数 (わかりやすさ)
  },
  "good_points": "評価できる点（1行）",
  "advice": "改善すべき点（辛口で1行）",
  "comment": "総評（1行）"
}
`;
          const result = await judgeModel.generateContent([
              { inlineData: { mimeType: "audio/wav", data: base64Audio } },
              { text: prompt }
          ]);

          const responseText = result.response.text();
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              return JSON.parse(jsonMatch[0]);
          }
          return null;
      } catch (e) {
          console.error("採点エラー:", e);
          return null;
      }
  }

  geminiWs.on('close', () => clientWs.close());
  clientWs.on('close', () => geminiWs.close());
});

function addWavHeader(samples: Buffer, sampleRate: number, numChannels: number, bitDepth: number): Buffer {
    const byteRate = (sampleRate * numChannels * bitDepth) / 8;
    const blockAlign = (numChannels * bitDepth) / 8;
    const buffer = Buffer.alloc(44 + samples.length);
    buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + samples.length, 4); buffer.write('WAVE', 8);
    buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22); buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28); buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitDepth, 34); buffer.write('data', 36);
    buffer.writeUInt32LE(samples.length, 40);
    samples.copy(buffer, 44);
    return buffer;
}