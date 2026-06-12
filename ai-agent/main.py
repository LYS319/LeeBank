from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="Bank AI Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "stub": os.getenv("USE_STUB", "false")}


@app.post("/ai/chat")
async def chat(body: dict):
    return {"type": "MESSAGE", "message": "AI agent is being prepared."}


@app.post("/ai/chat/confirm")
async def confirm(body: dict):
    return {"type": "MESSAGE", "message": "Confirm processing in progress."}

