# MIRA Test Suite

This directory contains all test scripts for the MIRA chatbot system.

## Test Files Overview

### 1. `test_simple.py` - Redis Components Test
**Purpose:** Tests Redis-backed features (cache, rate limiter, memory)

**What it tests:**
- ✅ Cache Manager (embedding + chat response caching)
- ✅ Rate Limiter (sliding window with Redis)
- ✅ Memory Manager (conversation history with Redis persistence)

**How to run:**
```powershell
python tests/test_simple.py
```

**Expected output:**
- Cache: PASS (stores and retrieves data)
- Rate Limiter: PASS (blocks request after limit)
- Memory: PASS (stores conversation turns)

---

### 2. `test_streaming.py` - SSE Streaming Test
**Purpose:** Tests Server-Sent Events (SSE) streaming endpoint

**What it tests:**
- ✅ Connection to `/chat/stream` endpoint
- ✅ SSE event format (JSON)
- ✅ Event types: start, status, token, metadata, error, done
- ✅ Full RAG pipeline in streaming mode

**How to run:**
```powershell
python tests/test_streaming.py
```

**Expected output:**
- Connection: 200 OK
- Events: Proper JSON format
- Pipeline: All steps streaming

---

### 3. `test_features.py` - Rate Limiting Test
**Purpose:** Tests rate limiting behavior with multiple requests

**What it tests:**
- ✅ Rate limit enforcement (10 requests per minute)
- ✅ 429 status code on exceeded limit
- ✅ Retry-after message

**How to run:**
```powershell
python tests/test_features.py
```

**Expected output:**
- Requests 1-10: Success (200 OK)
- Request 11+: Blocked (429 Too Many Requests)

---

### 4. `test_chat_api.py` - Chat Endpoint Test
**Purpose:** Tests the main chat endpoint with full request/response

**What it tests:**
- ✅ POST `/chat/` endpoint
- ✅ Request format (user_id, message)
- ✅ Response format (answer, sources, confidence, rag_used)
- ✅ End-to-end functionality

**How to run:**
```powershell
python tests/test_chat_api.py
```

**Expected output:**
- Status: 200 OK
- Response: JSON with answer and metadata

**Note:** Server must be running on port 8000

---

### 5. `test_chat.py` - Interactive Chat Test
**Purpose:** Simple script to send custom messages to MIRA

**What it tests:**
- ✅ Custom user prompts
- ✅ Response display
- ✅ Source citations

**How to run:**
```powershell
# Edit the script to change the message
python tests/test_chat.py
```

**Usage in script:**
```python
chat("ඔබගේ සේවා වේලාව කවරේද?")
chat("හෙලෝ")
```

---

### 6. `test_chat_endpoint.py` - Direct Endpoint Test
**Purpose:** Tests chat router function directly (without HTTP)

**What it tests:**
- ✅ RAG mode (document-based queries)
- ✅ Conversational mode (greetings, casual chat)
- ✅ Complete pipeline execution

**How to run:**
```powershell
python tests/test_chat_endpoint.py
```

**Expected output:**
- Multiple test cases with different query types
- RAG activation based on similarity threshold
- Sources list for RAG queries

---

### 7. `test_retriever.py` - Document Retrieval Test
**Purpose:** Tests the vector search retrieval system

**What it tests:**
- ✅ Qdrant vector search
- ✅ Similarity scoring
- ✅ Document metadata retrieval

**How to run:**
```powershell
python tests/test_retriever.py
```

**Expected output:**
- Similarity scores
- Filenames of matched documents
- Preview of matched content

---

## Prerequisites

### 1. Start Required Services
```powershell
docker-compose up -d
```
This starts:
- Redis (port 6379)
- Qdrant (port 6333)

### 2. Start MIRA Server
For tests that require HTTP endpoint:
```powershell
python -m uvicorn api.server:app --port 8000
```

### 3. Activate Virtual Environment
```powershell
.\.venv\Scripts\Activate.ps1
```

---

## Quick Test Commands

**Test all Redis features:**
```powershell
python tests/test_simple.py
```

**Test streaming:**
```powershell
python tests/test_streaming.py
```

**Test rate limiting:**
```powershell
python tests/test_features.py
```

**Test chat endpoint:**
```powershell
# Start server first!
python -m uvicorn api.server:app --port 8000
# In another terminal:
python tests/test_chat_api.py
```

---

## Troubleshooting

### Gemini API Quota Exceeded
If you see `429 You exceeded your current quota`:
- Wait for quota reset (24 hours for free tier)
- Or get a new API key
- Or upgrade to paid tier

Check quota status:
```powershell
python gemini_test.py
```

### Redis Connection Failed
```powershell
docker-compose up -d redis
docker ps  # Verify redis is running
```

### Qdrant Connection Failed
```powershell
docker-compose up -d qdrant
docker ps  # Verify qdrant is running
```

### Port 8000 Already in Use
```powershell
taskkill /F /IM python.exe
# Then restart server
```

---

## Test Coverage Summary

| Feature | Test File | Status |
|---------|-----------|--------|
| Redis Cache | test_simple.py | ✅ |
| Rate Limiter | test_simple.py, test_features.py | ✅ |
| Memory Manager | test_simple.py | ✅ |
| SSE Streaming | test_streaming.py | ✅ |
| Chat Endpoint | test_chat_api.py | ✅ |
| Document Retrieval | test_retriever.py | ✅ |
| RAG Pipeline | test_chat_endpoint.py | ✅ |

---

## Notes

- All tests use `test_user` as default user_id
- Rate limiting tests will trigger 429 errors (expected behavior)
- Streaming tests expect server errors when quota is exhausted
- Cache tests use Redis - ensure it's running
- Retrieval tests require Qdrant with loaded documents

---

**Last Updated:** December 3, 2025
