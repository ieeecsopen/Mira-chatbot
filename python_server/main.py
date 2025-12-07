import os
import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
from peft import PeftModel
from threading import Thread

app = FastAPI(title="Mira SinLlama API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model and tokenizer variables
model = None
tokenizer = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    # Additional options can be added here

@app.on_event("startup")
async def startup_event():
    global model, tokenizer
    print("Loading SinLlama model... This may take a while.")
    try:
        base_model_id = "meta-llama/Meta-Llama-3-8B"
        adapter_model_id = "polyglots/SinLlama_v01"
        
        # Load base model
        base_model = AutoModelForCausalLM.from_pretrained(
            base_model_id,
            device_map="auto",
            torch_dtype=torch.float16,
        )
        
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(base_model_id)
        
        # Load adapter
        model = PeftModel.from_pretrained(base_model, adapter_model_id)
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        print("Please ensure you have a Hugging Face account with access to Llama 3.")

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    if not model or not tokenizer:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Construct prompt from history
        # Simple format for now - can be enhanced based on model requirement
        conversation = []
        for msg in request.history:
            conversation.append({"role": msg.role, "content": msg.content})
        
        conversation.append({"role": "user", "content": request.message})
        
        input_ids = tokenizer.apply_chat_template(
            conversation, 
            add_generation_prompt=True, 
            return_tensors="pt"
        ).to(model.device)

        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
        generation_kwargs = dict(
            input_ids=input_ids, 
            streamer=streamer, 
            max_new_tokens=512,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
        )

        thread = Thread(target=model.generate, kwargs=generation_kwargs)
        thread.start()

        from fastapi.responses import StreamingResponse

        async def response_generator():
            for text in streamer:
                # SSE format
                import json
                data = json.dumps({
                    "candidates": [{
                        "content": {
                            "parts": [{"text": text}]
                        }
                    }]
                })
                yield f"data: {data}\n\n"

        return StreamingResponse(response_generator(), media_type="text/event-stream")

    except Exception as e:
        print(f"Error during generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
