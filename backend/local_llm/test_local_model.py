#!/usr/bin/env python3
"""
MedCorpus AI — Local Model Evaluation & Benchmark Suite
Tests the locally registered medcorpus-local model against the OpenAI-compatible Ollama endpoint.
"""
import time
import json
import httpx

BASE_URL = "http://localhost:11434/v1"
MODEL = "medcorpus-local"

TEST_PROMPTS = [
    {
        "name": "1. Fact Extraction & Clinical Separation",
        "prompt": "Patient lab report: Fasting Blood Glucose is 134 mg/dL (Ref: 70 - 99 mg/dL). HbA1c is 6.8% (Ref: < 5.7%). Serum Creatinine is 0.9 mg/dL (Ref: 0.6 - 1.2 mg/dL). Separate facts from clinical interpretation and wellness suggestions.",
    },
    {
        "name": "2. Patient Plain-Language Translation",
        "prompt": "Translate this lab finding for a worried patient in simple, non-threatening words: Low Hemoglobin 10.1 g/dL and Low Serum Ferritin 9 ng/mL.",
    },
    {
        "name": "3. Mini Doctor Box Wellness Advice",
        "prompt": "Provide lifestyle, diet, and routine suggestions for an individual with Total Cholesterol 245 mg/dL and LDL 165 mg/dL. State clearly that this is not a medical diagnosis.",
    }
]

def run_eval():
    print("===========================================================")
    print("    MedCorpus AI — Local Model Benchmark & Verification   ")
    print("===========================================================")
    print(f"• Target Endpoint: {BASE_URL}/chat/completions")
    print(f"• Active Model:    {MODEL}")
    print("-----------------------------------------------------------\n")

    for test in TEST_PROMPTS:
        t_name = test["name"]
        print(f"🔍 Running Test: {t_name}")
        payload = {
            "model": MODEL,
            "messages": [
                {"role": "user", "content": test["prompt"]}
            ],
            "max_tokens": 200,
            "temperature": 0.2
        }
        start_t = time.perf_counter()
        try:
            resp = httpx.post(f"{BASE_URL}/chat/completions", json=payload, timeout=60.0)
            duration = round((time.perf_counter() - start_t) * 1000, 1)
            if resp.status_code == 200:
                data = resp.json()
                reply = data["choices"][0]["message"]["content"].strip()
                print(f"✔ Response received in {duration} ms:")
                print("---------------------------------------------------")
                print(reply)
                print("---------------------------------------------------\n")
            else:
                print(f"❌ Failed with status {resp.status_code}: {resp.text}\n")
        except Exception as e:
            print(f"❌ Request failed: {e}\n")

if __name__ == "__main__":
    run_eval()
