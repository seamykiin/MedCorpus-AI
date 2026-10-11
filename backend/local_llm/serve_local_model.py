#!/usr/bin/env python3
"""
MedCorpus AI — Local LLM Server Bridge
Serves locally trained / fine-tuned models (e.g., Llama-3, Mistral, BioMistral, Med-Gemma)
with an OpenAI-compatible /chat/completions endpoint for MedCorpus.

Usage:
  python serve_local_model.py --model-path ./path_to_weights --port 8080
"""

import os
import sys
import time
import argparse
from typing import List, Dict, Any, Optional
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="MedCorpus Local LLM Server",
    description="Locally trained model server exposing OpenAI-compatible endpoints for MedCorpus AI.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Global model & tokenizer
MODEL = None
TOKENIZER = None
MODEL_NAME = "local-medcorpus-model"
DEVICE = "cpu"

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: Optional[str] = "local-medcorpus-model"
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.2
    max_tokens: Optional[int] = 512
    stream: Optional[bool] = False

class ChatCompletionResponseChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: str = "stop"

class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[ChatCompletionResponseChoice]

def load_local_model(model_path: str):
    global MODEL, TOKENIZER, MODEL_NAME, DEVICE
    MODEL_NAME = os.path.basename(os.path.abspath(model_path)) or "local-medcorpus-model"

    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        if torch.cuda.is_available():
            DEVICE = "cuda"
        elif torch.backends.mps.is_available():
            DEVICE = "mps"
        else:
            DEVICE = "cpu"

        print(f"📦 Loading local model from: {model_path} onto {DEVICE}...")
        TOKENIZER = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
        MODEL = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=torch.float16 if DEVICE != "cpu" else torch.float32,
            device_map=DEVICE if DEVICE == "cuda" else None,
            trust_remote_code=True
        )
        if DEVICE in ["mps", "cpu"]:
            MODEL.to(DEVICE)
        MODEL.eval()
        print(f"✔ Successfully loaded model '{MODEL_NAME}' on {DEVICE}!")
    except ImportError:
        print("⚠️ 'transformers' or 'torch' not installed in this environment.")
        print("Running in simulated local mock mode for testing connection.")
    except Exception as e:
        print(f"⚠️ Could not load weights from '{model_path}': {e}")
        print("Running in simulated local mock mode for testing connection.")

@app.get("/")
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "device": DEVICE,
        "loaded": MODEL is not None
    }

@app.post("/chat/completions", response_model=ChatCompletionResponse)
@app.post("/v1/chat/completions", response_model=ChatCompletionResponse)
async def chat_completions(req: ChatCompletionRequest):
    start_t = time.time()
    
    # 1. Format prompt from messages
    system_text = ""
    user_text = ""
    for msg in req.messages:
        if msg.role == "system":
            system_text = msg.content
        elif msg.role == "user":
            user_text = msg.content

    generated_reply = ""

    # 2. If transformers model is loaded, run inference
    if MODEL is not None and TOKENIZER is not None:
        try:
            import torch
            prompt_full = f"{system_text}\n\nUser: {user_text}\nAssistant:" if system_text else user_text
            inputs = TOKENIZER(prompt_full, return_tensors="pt").to(DEVICE)
            
            with torch.no_grad():
                outputs = MODEL.generate(
                    **inputs,
                    max_new_tokens=req.max_tokens or 256,
                    temperature=req.temperature or 0.2,
                    do_sample=req.temperature > 0 if req.temperature else False,
                    pad_token_id=TOKENIZER.eos_token_id
                )
            decoded = TOKENIZER.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
            generated_reply = decoded.strip()
        except Exception as e:
            generated_reply = f"[Local Model Error: {e}]"
    else:
        # Fallback simulator for verifying pipeline before weights are downloaded
        generated_reply = (
            f"[Response from Locally Served MedCorpus Model: {MODEL_NAME}]\n"
            f"Grounded response: Verified clinical laboratory findings are analyzed without hallucination. "
            f"Parameters outside reference intervals require physician consultation."
        )

    return ChatCompletionResponse(
        id=f"chatcmpl-local-{int(time.time())}",
        created=int(time.time()),
        model=MODEL_NAME,
        choices=[
            ChatCompletionResponseChoice(
                index=0,
                message=ChatMessage(role="assistant", content=generated_reply),
                finish_reason="stop"
            )
        ]
    )

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Serve locally trained model for MedCorpus")
    parser.add_argument("--model-path", type=str, default="./weights", help="Path to Hugging Face model directory or LoRA checkpoint")
    parser.add_argument("--port", type=int, default=8080, help="Port to run local server on")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host interface")
    args = parser.parse_args()

    load_local_model(args.model_path)
    print(f"🚀 MedCorpus Local Model Server listening on http://localhost:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)
