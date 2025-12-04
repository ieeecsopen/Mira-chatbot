# MIRA API - Frontend Integration

## Base URL
```
http://localhost:8000
```

## Endpoints

### 1. Chat (Regular)
**Purpose:** Send a message and get complete response at once

```
POST /chat/
```

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

### 2. Chat (Streaming)
**Purpose:** Real-time streaming response (word-by-word) using Server-Sent Events

**When to use:**
- ✅ Want ChatGPT-like typing effect
- ✅ Better user experience (feels faster)
- ✅ Show partial answer while generating

**How it works:**
1. Frontend sends POST request
2. Server keeps connection open
3. Server sends words one-by-one as events
4. Frontend displays each word immediately
5. Connection closes when done

```
POST /chat/stream
```

**Request:** Same as regular chat

**Response:** Server-Sent Events (multiple messages)
```
data: {"event": "start", "message": "Processing..."}
data: {"event": "token", "text": "ආයුබෝවන්! "}
data: {"event": "token", "text": "මම "}
data: {"event": "token", "text": "MIRA"}
data: {"event": "done"}
```

**Event Types:**
- `start` - Processing started (show "typing..." indicator)
- `status` - Current step (preprocessing, retrieving_documents, etc.)
- `token` - Word chunk to display
- `metadata` - Sources, confidence, rag_used
- `error` - If something went wrong
- `done` - Finished (hide "typing..." indicator)

### 3. Health Check
**Purpose:** Verify server is running

```
GET /health
```

## JavaScript Example

```javascript
// Regular chat
const response = await fetch('http://localhost:8000/chat/', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    user_id: 'user123',
    message: 'හෙලෝ'
  })
});
const data = await response.json();
console.log(data.answer);
```

## Conversation Memory

**Use same `user_id` to continue conversation:**

```javascript
// Message 1
{user_id: "user123", message: "මගේ නම සාමන්"}

// Message 2 - MIRA remembers!
{user_id: "user123", message: "මගේ නම මොකද්ද?"}
// Response: "ඔබේ නම සාමන්"
```

## Rate Limits
- 10 requests/minute per user
- 100 requests/hour per user

## Error Codes
- `200` - Success
- `429` - Rate limit exceeded
- `500` - Server error

## Interactive Docs
- Swagger UI: `http://localhost:8000/docs`
