# MedCorpus AI — Local LLM Integration Guide

This directory provides everything you need to replace cloud APIs (such as Google Gemini or OpenAI) with your **locally trained or fine-tuned medical LLM**.

---

## 🎯 How It Works

MedCorpus AI supports a pluggable AI provider architecture. You can switch between cloud APIs and local models in two ways:
1. **From the Frontend UI**: Click the **AI Engine** button in the header bar and switch to "Locally Trained LLM".
2. **From `.env`**: Set `ACTIVE_LLM_PROVIDER=local` and `LOCAL_LLM_URL=http://localhost:8080/v1`.

---

## 🚀 Option 1: Serve Fine-Tuned PyTorch / HuggingFace Weights

If you have trained weights (e.g. fine-tuned LLaMA-3, Mistral, BioMistral, Med-Gemma, or LoRA adapters):

1. **Install dependencies**:
   ```bash
   pip install torch transformers accelerate uvicorn fastapi
   ```

2. **Launch the server with your model weights**:
   ```bash
   python backend/local_llm/serve_local_model.py --model-path ./path/to/my_finetuned_model --port 8080
   ```
   *On Mac with Apple Silicon (M1/M2/M3/M4), PyTorch will automatically use the `mps` GPU accelerator.*

3. **Configure MedCorpus to use your local server**:
   In `.env`:
   ```bash
   ACTIVE_LLM_PROVIDER=local
   LOCAL_LLM_URL=http://localhost:8080/v1
   LOCAL_LLM_MODEL=my_finetuned_model
   ```

---

## 🦙 Option 2: Run via Ollama (GGUF Quantized Weights)

If you exported your model to GGUF format:

1. **Create an Ollama Modelfile**:
   ```dockerfile
   FROM ./my_finetuned_model.gguf
   SYSTEM "You are MedCorpus Clinical AI, synthesizing laboratory findings objectively."
   PARAMETER temperature 0.2
   ```

2. **Build and run in Ollama**:
   ```bash
   ollama create medcorpus-local -f Modelfile
   ollama run medcorpus-local
   ```

3. **Configure MedCorpus**:
   In `.env`:
   ```bash
   ACTIVE_LLM_PROVIDER=local
   LOCAL_LLM_URL=http://localhost:11434/v1
   LOCAL_LLM_MODEL=medcorpus-local
   ```

---

## ⚡ Option 3: Run via vLLM (High-Throughput Production)

If serving on an Nvidia GPU or cloud box with vLLM:
```bash
vllm serve ./path/to/my_finetuned_model --port 8000
```
In `.env`:
```bash
ACTIVE_LLM_PROVIDER=local
LOCAL_LLM_URL=http://localhost:8000/v1
LOCAL_LLM_MODEL=my_finetuned_model
```

---

## 🧪 Testing Your Connection

You can test whether MedCorpus can communicate with your local model using the backend test endpoint:
```bash
curl -X POST http://localhost:8000/api/llm/test \
  -H "Content-Type: application/json" \
  -d '{"query": "Explain normal hemoglobin levels."}'
```
Or simply click **"Test Connection"** inside the MedCorpus web UI!
