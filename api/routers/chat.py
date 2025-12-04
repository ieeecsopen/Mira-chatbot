# api/routers/chat.py
"""
Chat endpoint with full RAG pipeline.
Handles user queries with document retrieval, LLM generation, and safety checks.
Enhanced with caching and rate limiting.
"""
import os
import logging
from fastapi import APIRouter, HTTPException
from typing import List, Dict

from api.models import ChatRequest, ChatResponse, ErrorResponse
from core.preprocess import preprocess_text
from core.safety import pre_check, post_check, get_refusal_message, sanitize_output
from core.retriever import retrieve
from core.prompt_builder import (
    build_rag_prompt,
    build_chat_prompt,
    build_sources_list,
    calculate_confidence
)
from core.memory import MemoryManager
from core.cache import CacheManager
from core.rate_limiter import RateLimiter
from core.grammar_polish import polish_sinhala
from models.llm_client import GeminiClient

# Configuration
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.7"))
ENABLE_GRAMMAR_POLISH = os.getenv("ENABLE_GRAMMAR_POLISH", "true").lower() == "true"
ENABLE_RAG = os.getenv("ENABLE_RAG", "true").lower() == "true"
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
ENABLE_CACHE = os.getenv("ENABLE_CACHE", "true").lower() == "true"
ENABLE_RATE_LIMIT = os.getenv("ENABLE_RATE_LIMIT", "true").lower() == "true"

# Initialize components
router = APIRouter()
llm = GeminiClient()
memory = MemoryManager(redis_url=REDIS_URL)
cache = CacheManager(redis_url=REDIS_URL, enabled=ENABLE_CACHE)
rate_limiter = RateLimiter(
    redis_url=REDIS_URL,
    enabled=ENABLE_RATE_LIMIT,
    requests_per_minute=int(os.getenv("RATE_LIMIT_PER_MINUTE", 10)),
    requests_per_hour=int(os.getenv("RATE_LIMIT_PER_HOUR", 100))
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@router.post("/", response_model=ChatResponse, responses={400: {"model": ErrorResponse}})
async def chat(req: ChatRequest) -> ChatResponse:
    """
    Main chat endpoint with RAG pipeline.
    Enhanced with caching and rate limiting.
    
    Pipeline:
    1. Rate limit check
    2. Check cache for complete response
    3. Preprocess message
    4. Pre-safety check
    5. Retrieve documents (if RAG enabled)
    6. Build prompt (RAG or conversational)
    7. Generate answer with LLM (with cache)
    8. Polish Sinhala grammar (optional)
    9. Post-safety check
    10. Update memory
    11. Cache response
    12. Return response
    """
    
    # ==========================================
    # STEP 1: RATE LIMITING
    # ==========================================
    allowed, retry_after = rate_limiter.check_rate_limit(req.user_id)
    if not allowed:
        logger.warning(f"🚫 Rate limit exceeded for user {req.user_id}")
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Please try again in {retry_after}"
        )
    
    # ==========================================
    # STEP 2: CHECK CACHE FOR COMPLETE RESPONSE
    # ==========================================
    cached_response = cache.get_chat_response(req.user_id, req.message)
    if cached_response:
        logger.info(f"✅ Returning cached response for user {req.user_id}")
        return ChatResponse(**cached_response)
    
    # ==========================================
    # STEP 3: PREPROCESS MESSAGE
    # ==========================================
    try:
        processed_msg = preprocess_text(req.message)
        logger.info(f"User {req.user_id}: {processed_msg[:100]}...")
    except Exception as e:
        logger.error(f"Preprocessing failed: {e}")
        raise HTTPException(status_code=400, detail="Failed to process message")
    
    # ==========================================
    # STEP 4: PRE-SAFETY CHECK
    # ==========================================
    is_safe, unsafe_reason = pre_check(processed_msg)
    if not is_safe:
        logger.warning(f"Pre-check failed for user {req.user_id}: {unsafe_reason}")
        return ChatResponse(
            answer=get_refusal_message("sinhala"),
            sources=[],
            confidence="Low",
            rag_used=False
        )
    
    # ==========================================
    # STEP 5: RETRIEVE DOCUMENTS (RAG) WITH CACHE
    # ==========================================
    rag_used = False
    sources = []
    best_score = 0.0
    context_chunks = []
    
    if ENABLE_RAG:
        try:
            # Check document cache
            cached_docs = cache.get_documents(processed_msg)
            if cached_docs:
                hits = cached_docs
                logger.info(f"✅ Using cached documents: {len(hits)} results")
            else:
                hits = retrieve(processed_msg)
                cache.set_documents(processed_msg, hits)
                logger.info(f"Retrieved {len(hits)} documents")
            
            if hits and len(hits) > 0:
                best_score = hits[0].get("score", 0.0) or 0.0
                logger.info(f"Best similarity score: {best_score:.3f}")
                
                # Check if similarity is high enough
                if best_score >= SIMILARITY_THRESHOLD:
                    rag_used = True
                    context_chunks = [
                        {
                            "text": hit.get("payload", {}).get("text", ""),
                            "filename": hit.get("payload", {}).get("filename", "Unknown"),
                            "preview": hit.get("payload", {}).get("preview", "")
                        }
                        for hit in hits[:3]  # Top 3 results
                    ]
                    sources = build_sources_list(hits[:3])
                    logger.info(f"Using RAG mode with {len(sources)} sources")
        except Exception as e:
            logger.error(f"Retrieval failed: {e}")
            # Continue without RAG if retrieval fails
            rag_used = False
    
    # ==========================================
    # STEP 6: BUILD PROMPT
    # ==========================================
    if rag_used:
        # RAG mode: Use retrieved documents
        prompt = build_rag_prompt(
            question=processed_msg,
            context_chunks=context_chunks,
            include_sources=True
        )
        logger.info("Using RAG prompt with retrieved context")
    else:
        # Conversational mode: Use memory
        recent_turns = memory.get_recent(req.user_id)
        prompt = build_chat_prompt(
            question=processed_msg,
            memory_turns=recent_turns
        )
        logger.info(f"Using chat prompt with {len(recent_turns)} memory turns")
    
    # ==========================================
    # STEP 7: GENERATE ANSWER WITH CACHE
    # ==========================================
    try:
        # Check LLM response cache
        cached_llm = cache.get_llm_response(prompt)
        if cached_llm:
            raw_answer = cached_llm
            logger.info(f"✅ Using cached LLM response ({len(raw_answer)} chars)")
        else:
            raw_answer = await llm.generate(prompt)
            cache.set_llm_response(prompt, raw_answer)
            logger.info(f"Generated answer: {len(raw_answer)} chars")
    except Exception as e:
        logger.error(f"LLM generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")
    
    # ==========================================
    # STEP 8: GRAMMAR POLISH (Optional)
    # ==========================================
    if ENABLE_GRAMMAR_POLISH:
        try:
            polished_answer = await polish_sinhala(raw_answer)
            logger.info("Grammar polishing completed")
        except Exception as e:
            logger.warning(f"Grammar polishing failed, using raw answer: {e}")
            polished_answer = raw_answer
    else:
        polished_answer = raw_answer
    
    # ==========================================
    # STEP 9: POST-SAFETY CHECK
    # ==========================================
    is_safe, unsafe_reason = post_check(polished_answer)
    if not is_safe:
        logger.warning(f"Post-check failed: {unsafe_reason}")
        return ChatResponse(
            answer=get_refusal_message("sinhala"),
            sources=[],
            confidence="Low",
            rag_used=False
        )
    
    # Sanitize output (remove emails, phone numbers, etc.)
    final_answer = sanitize_output(polished_answer)
    
    # ==========================================
    # STEP 10: UPDATE MEMORY
    # ==========================================
    try:
        memory.push_turn(req.user_id, {
            "user": req.message,
            "assistant": final_answer
        })
        logger.info(f"Memory updated for user: {req.user_id}")
    except Exception as e:
        logger.error(f"Failed to update memory: {e}", exc_info=True)
        # Continue even if memory update fails
    
    # ==========================================
    # STEP 11: CALCULATE CONFIDENCE & BUILD RESPONSE
    # ==========================================
    confidence = calculate_confidence(best_score, SIMILARITY_THRESHOLD)
    
    response_data = {
        "answer": final_answer,
        "sources": sources,
        "confidence": confidence,
        "rag_used": rag_used
    }
    
    # ==========================================
    # STEP 12: CACHE COMPLETE RESPONSE
    # ==========================================
    cache.set_chat_response(req.user_id, req.message, response_data, ttl=1800)  # 30 min cache
    
    return ChatResponse(**response_data)
    
    logger.info(f"Response complete: RAG={rag_used}, Confidence={confidence}, Sources={len(sources)}")
    
    return ChatResponse(
        answer=final_answer,
        sources=sources,
        confidence=confidence,
        rag_used=rag_used
    )
