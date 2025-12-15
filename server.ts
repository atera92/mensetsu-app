/**
 * server.ts (精密診断モード)
 * エラーの詳細理由をコンソールに表示します
 */
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.GEMINI_API_KEY;

console.log("--------------------------------------------------");
if (!API_KEY) {
  console.error("❌ エラー: APIキーが見つかりません！");
  process.exit(1);
} else {
  console.log(`✅ APIキーを読み込みました (末尾: ...${API_KEY.slice(-4)})`);
}
console.log("--------------------------------------------------");

const HOST = "generativelanguage.googleapis.com";
const PATH = "/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";
const GEMINI_URL = `wss://${HOST}${PATH}?key=${API_KEY}`;

// ★診断用に、使おうとしているモデル名を変数にする
const MODEL_NAME = "models/gemini-2.5-flash"; 

const wss = new WebSocketServer({ port: 8080 });

console.log(`📞 面接電話サーバー(診断モード)起動`);
console.log(`   使用モデル: ${MODEL_NAME}`);
console.log("   ws://localhost:8080 で待機中...");

wss.on('connection', (clientWs: WebSocket) => {
  console.log("👤 [クライアント] 接続あり");

  const geminiWs = new WebSocket(GEMINI_URL);

  const initialSetupMessage = {
    setup: {
      model: MODEL_NAME,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }
        }
      }
    }
  };

  const systemPrompt = `
あなたは日本のIT企業のベテラン採用担当「佐藤（さとう）」です。
面接を開始してください。
`;

  geminiWs.on('open', () => {
    console.log("🤖 [Gemini] 接続成功！設定を送信します...");
    geminiWs.send(JSON.stringify(initialSetupMessage));
    
    const firstMessage = {
        clientContent: {
            turns: [{
                role: "user",
                parts: [{ text: systemPrompt }]
            }],
            turnComplete: true
        }
    };
    geminiWs.send(JSON.stringify(firstMessage));
  });

  geminiWs.on('message', (data: any) => {
    // 正常にメッセージが来た場合
    try {
        const msg = JSON.parse(data.toString());
        if (msg.serverContent) {
            console.log("🤖 [Gemini] 音声データを受信しました");
        } else {
            console.log("🤖 [Gemini] 制御メッセージ:", data.toString().slice(0, 100));
        }
    } catch(e) {}
    
    if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data.toString());
    }
  });

  // ★ここが重要！エラーの詳細を表示
  geminiWs.on('error', (err) => {
      console.error("🔥 [Geminiエラー] 通信エラー発生:", err);
  });

  geminiWs.on('close', (code, reason) => {
    console.log(`🤖 [Gemini切断] サーバーが切断されました`);
    console.log(`   コード: ${code}`);
    console.log(`   理由: ${reason.toString()}`); // ←ここに原因が出ます
    clientWs.close();
  });

  clientWs.on('close', () => {
    console.log("👤 [クライアント] 切断");
    geminiWs.close();
  });
});