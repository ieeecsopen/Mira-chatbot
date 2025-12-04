from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers.chat import router as chat_router
from api.routers.chat_stream import router as stream_router

app = FastAPI(title="MIRA - dev")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(stream_router, prefix="/chat", tags=["streaming"])

@app.get("/health")
async def health():
    return {"status": "ok"}
