# MIRA - සිංහල AI සහායකයා

**MIRA** (Multilingual Intelligent Response Assistant) - Sinhala AI chatbot with RAG, caching, rate limiting, and conversation memory.

## ✨ Features

- 🔍 **RAG Pipeline** - Document retrieval with vector search
- 🧠 **Conversation Memory** - 30-day Redis persistence  
- ⚡ **Caching** - Multi-level (embeddings, LLM, documents, chat)
- 🚦 **Rate Limiting** - 10/min, 100/hour per user
- 🌊 **SSE Streaming** - Real-time response streaming
- 🛡️ **Safety Layer** - Content moderation
- ✍️ **Grammar Polish** - Sinhala text correction

## 📁 Project Structure

```
MIRA/
├── api/
│   ├── server.py              # FastAPI application
│   ├── models.py              # Request/response models
│   └── routers/
│       ├── chat.py            # Main chat endpoint
│       └── chat_stream.py     # SSE streaming endpoint
├── core/
│   ├── cache.py               # Redis caching
│   ├── rate_limiter.py        # Rate limiting
│   ├── memory.py              # Conversation memory
│   ├── retriever.py           # Vector search
│   ├── prompt_builder.py      # Prompt generation
│   ├── safety.py              # Content moderation
│   ├── grammar_polish.py      # Text correction
│   └── preprocess.py          # Text preprocessing
├── models/
│   └── llm_client.py          # Gemini API wrapper
├── rag/
│   ├── ingest.py              # Document ingestion
│   └── documents/             # PDF/TXT files
├── tests/                     # Test scripts
├── config/
│   └── .env                   # Configuration
└── docker-compose.yml         # Redis + Qdrant
```

## 🚀 First Time Setup

### 1. Prerequisites
- Python 3.10+
- Docker Desktop
- Gemini API key ([Get here](https://aistudio.google.com/app/apikey))

### 2. Install Dependencies

```powershell
# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install packages
pip install -r requirements.txt
```

### 3. Configure Environment

Edit `config/.env`:
```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### 4. Start Services

```powershell
# Start Redis + Qdrant
docker-compose up -d

# Verify services running
docker ps
```

### 5. Ingest Documents (Optional)

```powershell
# Place PDF/TXT files in rag/documents/
python rag/ingest.py
```

### 6. Start Server

```powershell
python -m uvicorn api.server:app --port 8000
```

Server runs at: `http://localhost:8000`

## 🎯 Quick Start

### Test API

```powershell
# Test Gemini API key
python gemini_test.py

# Test chat endpoint
python tests/test_chat_api.py

# Test conversation memory
python tests/test_simple_conversation.py
```

### API Request (Postman/curl)

**Endpoint:** `POST http://localhost:8000/chat/`

**Request:**
```json
{
  "user_id": "user123",
  "message": "හෙලෝ"
}
```

**Response:**
```json
{
  "answer": "ආයුබෝවන්! මම MIRA...",
  "sources": [],
  "confidence": "Medium",
  "rag_used": false
}
```

### Continue Conversation

Use the **same `user_id`** to continue the conversation:

```json
{"user_id": "user123", "message": "මගේ නම සාමන්"}
{"user_id": "user123", "message": "මගේ නම මොකද්ද?"} 
```
→ MIRA will remember "සාමන්"

## 📚 Documentation

- **Tests:** See [tests/README.md](tests/README.md)
- **API Docs:** `http://localhost:8000/docs` (Swagger UI)

## 🔧 Configuration

Key settings in `config/.env`:

```env
# Gemini
GEMINI_MODEL=gemini-2.5-flash

# Rate Limits
RATE_LIMIT_PER_MINUTE=10
RATE_LIMIT_PER_HOUR=100

# Cache TTL (seconds)
CACHE_CHAT_TTL=1800

# Memory
MEMORY_WINDOW=4
```

## 🛠️ Troubleshooting

**Quota exceeded:**
```powershell
python gemini_test.py  # Check API status
```

**Redis connection failed:**
```powershell
docker-compose up -d redis
```

**Port 8000 in use:**
```powershell
taskkill /F /IM python.exe
```