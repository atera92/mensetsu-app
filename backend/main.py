import os
import base64
import tempfile
import asyncio
import re  # 正規表現を使うためのライブラリを追加
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import edge_tts

# ▼▼▼ あなたのAPIキーに書き換えてください ▼▼▼
GEMINI_API_KEY = "AIzaSyBln0fxlEgGwoGa412DusbI0IMedw9TKA4"

genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Geminiの設定
safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

model = genai.GenerativeModel('gemini-2.5-flash')

# プロンプト：思考を出力しないように強く指示しつつ、万が一出てもPythonで消す運用にします
chat_session = model.start_chat(history=[
    {
        "role": "user",
        "parts": ["あなたはIT企業の採用面接官です。優しく、しかし鋭い質問をしてください。返答は150文字以内の日本語で、会話形式で短く返してください。思考プロセス（THOUGHTなど）は出力しないでください。"]
    },
    {
        "role": "model",
        "parts": ["承知いたしました。あなたの経歴についてお聞かせください。"]
    }
])

class ChatRequest(BaseModel):
    message: str

# テキストから不要な部分（(THOUGHT...)など）を消す関数
def clean_text(text: str) -> str:
    # (THOUGHT ...) や (Plan ...) などのカッコ書きブロックを削除
    text = re.sub(r'\(.*?\)', '', text, flags=re.DOTALL)
    # 余分な改行や空白を削除
    text = text.replace('\n', ' ').strip()
    return text

@app.post("/api/chat")
async def chat(request: ChatRequest):
    reply_text = ""
    try:
        if not request.message:
            return {"reply": "...", "audio": None}
            
        print(f"User: {request.message}")
        
        # 1. Geminiでテキスト生成
        response = chat_session.send_message(request.message, safety_settings=safety_settings)
        
        raw_text = response.text if response.text else ""
        print(f"AI(Raw): {raw_text}") # デバッグ用に生の出力を表示
        
        # 2. テキストのクリーニング（ここが重要！）
        # AIが思考を出してしまっても、ここで消して音声には入れない
        reply_text = clean_text(raw_text)
        
        # クリーニングしたら空っぽになってしまった場合の保険
        if not reply_text:
            reply_text = "申し訳ありません。もう一度お願いします。"

        print(f"AI(Clean): {reply_text}")
        
        # 3. edge-ttsで音声生成
        # Nanamiは日本語音声として非常に安定しています
        VOICE = "ja-JP-NanamiNeural"
        communicate = edge_tts.Communicate(reply_text, VOICE)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as fp:
            temp_filename = fp.name
            
        await communicate.save(temp_filename)
        
        with open(temp_filename, "rb") as fp:
            audio_data = base64.b64encode(fp.read()).decode("utf-8")
            
        os.remove(temp_filename)

        # 画面表示用には生のテキスト（思考含むかも）ではなく、綺麗なテキストを返す
        return {"reply": reply_text, "audio": audio_data}
        
    except Exception as e:
        print(f"Error: {e}")
        # エラー時は音声なしでテキストだけ返す
        return {"reply": reply_text if reply_text else "エラーが発生しました。", "audio": None}