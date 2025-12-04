# api/models.py
"""
Pydantic models for API request/response validation.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class ChatRequest(BaseModel):
    """Request model for /chat endpoint."""
    user_id: str = Field(..., description="Unique user identifier", min_length=1, max_length=100)
    message: str = Field(..., description="User's message/question", min_length=1, max_length=2000)
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user123",
                "message": "ඔබගේ සේවා වේලාව කවරේද?"
            }
        }


class ChatResponse(BaseModel):
    """Response model for /chat endpoint."""
    answer: str = Field(..., description="AI assistant's response in Sinhala")
    sources: List[str] = Field(default=[], description="List of source documents used")
    confidence: str = Field(default="Medium", description="Confidence level: High/Medium/Low")
    rag_used: bool = Field(default=False, description="Whether RAG retrieval was used")
    
    class Config:
        json_schema_extra = {
            "example": {
                "answer": "අපගේ සේවා වේලාව සඳුදා සිට සිකුරාදා දක්වා පෙ.ව. 9.00 සිට ප.ව. 5.00 දක්වා වේ.",
                "sources": ["services.pdf", "faq.txt"],
                "confidence": "High",
                "rag_used": True
            }
        }


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "Invalid request",
                "detail": "Message cannot be empty"
            }
        }
