# api/routers/chat_stream.py
"""
Streaming chat endpoint using Server-Sent Events (SSE).
Provides real-time streaming of LLM responses for better UX.
"""
import asyncio
import json
import logging
import os
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from api.models import ChatRequest, ErrorResponse
from core.retriever import retrieve
from models.llm_client import GeminiClient
from core.preprocess import preprocess_text
from core.safety import pre_check, post_check, get_refusal_message, sanitize_output
from core.prompt_builder import build_rag_prompt, build_chat_prompt, build_sources_list, calculate_confidence
from core.memory import MemoryManager
from core.cache import CacheManager
from core.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize components
llm = GeminiClient()
memory = MemoryManager(
    redis_url=os.getenv("REDIS_URL", "redis://localhost:6379")
)
cache = CacheManager(
    redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
    enabled=os.getenv("ENABLE_CACHE", "true").lower() == "true"
)
rate_limiter = RateLimiter(
    redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
    enabled=os.getenv("ENABLE_RATE_LIMIT", "true").lower() == "true",
    requests_per_minute=int(os.getenv("RATE_LIMIT_PER_MINUTE", 10)),
    requests_per_hour=int(os.getenv("RATE_LIMIT_PER_HOUR", 100))
)

# Configuration
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", 0.7))
TOP_K = int(os.getenv("TOP_K", 4))
ENABLE_RAG = os.getenv("ENABLE_RAG", "true").lower() == "true"
ENABLE_GRAMMAR_POLISH = os.getenv("ENABLE_GRAMMAR_POLISH", "true").lower() == "true"


async def generate_streaming_response(
    user_id: str,
    message: str
) -> AsyncGenerator[str, None]:
    """
    Generator function for streaming chat responses.
    Yields JSON events for SSE.
    """
    try:
        # Send initial status
        yield json.dumps({"event": "start", "message": "Processing your request..."})
        
        # Step 1: Preprocess
        yield json.dumps({"event": "status", "step": "preprocessing"})
        clean_message = preprocess_text(message)
        logger.info(f"User {user_id}: {clean_message[:100]}...")
        
        # Step 2: Safety pre-check
        yield json.dumps({"event": "status", "step": "safety_check"})
        is_safe, violation_reason = pre_check(clean_message)
        if not is_safe:
            refusal = get_refusal_message(clean_message)
            yield json.dumps({"event": "error", "type": "safety_violation", "message": refusal})
            yield json.dumps({"event": "done"})
            return
        
        # Step 3: Retrieve documents if RAG enabled
        retrieved_docs = []
        rag_used = False
        
        if ENABLE_RAG:
            yield json.dumps({"event": "status", "step": "retrieving_documents"})
            
            # Check cache first
            cached_docs = cache.get_documents(clean_message)
            if cached_docs:
                retrieved_docs = cached_docs
                logger.info("✅ Using cached documents")
            else:
                retrieved_docs = await retrieve(clean_message, top_k=TOP_K)
                cache.set_documents(clean_message, retrieved_docs)
            
            logger.info(f"Retrieved {len(retrieved_docs)} documents")
            
            # Check if we should use RAG mode
            if retrieved_docs:
                best_score = max(doc.get("score", 0) for doc in retrieved_docs)
                logger.info(f"Best similarity score: {best_score:.3f}")
                
                if best_score >= SIMILARITY_THRESHOLD:
                    rag_used = True
                    yield json.dumps({"event": "rag_activated", "score": round(best_score, 3)})
        
        # Step 4: Build prompt
        yield json.dumps({"event": "status", "step": "building_prompt"})
        
        memory_turns = memory.get_recent(user_id)
        
        if rag_used and retrieved_docs:
            prompt = build_rag_prompt(clean_message, retrieved_docs, memory_turns)
            sources = build_sources_list(retrieved_docs)
            logger.info(f"Using RAG mode with {len(sources)} sources")
        else:
            prompt = build_chat_prompt(clean_message, memory_turns)
            sources = []
            logger.info(f"Using chat prompt with {len(memory_turns)} memory turns")
        
        # Step 5: Generate answer with streaming
        yield json.dumps({"event": "status", "step": "generating_response"})
        
        # Check cache for full response
        cached_response = cache.get_llm_response(prompt)
        if cached_response:
            logger.info("✅ Using cached LLM response")
            # Send cached response in chunks for smooth UX
            words = cached_response.split()
            for i in range(0, len(words), 5):
                chunk = " ".join(words[i:i+5])
                yield json.dumps({"event": "token", "text": chunk + " "})
                await asyncio.sleep(0.05)  # Simulate streaming
            raw_answer = cached_response
        else:
            # Stream from LLM
            raw_answer = await llm.generate(prompt)
            
            # Simulate streaming by sending in chunks
            words = raw_answer.split()
            for i in range(0, len(words), 5):
                chunk = " ".join(words[i:i+5])
                yield json.dumps({"event": "token", "text": chunk + " "})
                await asyncio.sleep(0.05)
            
            # Cache the response
            cache.set_llm_response(prompt, raw_answer)
        
        # Step 6: Grammar polish (optional)
        answer = raw_answer
        if ENABLE_GRAMMAR_POLISH and any(ord(c) >= 0x0D80 and ord(c) <= 0x0DFF for c in raw_answer):
            yield json.dumps({"event": "status", "step": "polishing_grammar"})
            try:
                polish_prompt = f"කරුණාකර මෙම පිළිතුර ව්‍යාකරණමය වශයෙන් නිවැරදි කරන්න:\\n{raw_answer}"
                answer = await llm.generate(polish_prompt, max_tokens=2048)
                logger.info("✅ Grammar polished")
            except Exception as e:
                logger.warning(f"Grammar polish failed: {e}")
                answer = raw_answer
        
        # Step 7: Post safety check
        is_safe, unsafe_reason = post_check(answer)
        if not is_safe:
            refusal = get_refusal_message("sinhala")
            yield json.dumps({"event": "error", "type": "safety_violation", "message": refusal})
            yield json.dumps({"event": "done"})
            return
        
        # Sanitize output
        final_answer = sanitize_output(answer)
        
        # Step 8: Update memory
        memory.push_turn(user_id, {"user": clean_message, "assistant": final_answer})
        
        # Step 9: Send metadata
        best_score = max(doc.get("score", 0) for doc in retrieved_docs) if retrieved_docs else 0
        confidence = calculate_confidence(best_score, SIMILARITY_THRESHOLD)
        
        metadata = {
            "event": "metadata",
            "sources": sources,
            "confidence": confidence,
            "rag_used": rag_used
        }
        
        yield json.dumps(metadata)
        
        # Send completion event
        yield json.dumps({"event": "done"})
        
        logger.info(f"✅ Streamed response for user {user_id}")
        
    except Exception as e:
        logger.error(f"Streaming error: {e}", exc_info=True)
        yield json.dumps({"event": "error", "type": "server_error", "message": "An error occurred"})
        yield json.dumps({"event": "done"})


@router.post("/stream")
async def chat_stream(request: ChatRequest, http_request: Request):
    """
    Streaming chat endpoint using Server-Sent Events.
    
    Returns a stream of JSON events:
    - start: Streaming begins
    - status: Processing step updates
    - rag_activated: RAG mode activated with similarity score
    - token: Individual response tokens
    - metadata: Sources, confidence, RAG usage
    - error: Error occurred
    - done: Streaming complete
    
    Example client (JavaScript):
    ```javascript
    const evtSource = new EventSource('/chat/stream');
    evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event === 'token') {
            // Append token to UI
            displayToken(data.text);
        }
    };
    ```
    """
    logger.info(f"📡 Stream request from user: {request.user_id}")
    
    # Rate limiting check
    allowed, retry_after = rate_limiter.check_rate_limit(request.user_id)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {retry_after}"
        )
    
    # Return EventSourceResponse for SSE
    return EventSourceResponse(
        generate_streaming_response(request.user_id, request.message),
        media_type="text/event-stream"
    )
