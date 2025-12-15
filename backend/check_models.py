import google.generativeai as genai

# ▼▼▼ あなたのAPIキー ▼▼▼
GEMINI_API_KEY = "AIzaSyBln0fxlEgGwoGa412DusbI0IMedw9TKA4"

genai.configure(api_key=GEMINI_API_KEY)

print("=== あなたが使えるモデル一覧 ===")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"エラー: {e}")