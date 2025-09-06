"""Pydantic models for API requests and responses."""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
import uuid


class ChatMessage(BaseModel):
    """A single chat message."""
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    """Request for chat endpoint."""
    messages: List[ChatMessage]
    stream: bool = False
    rag_only: bool = True


class SourceCitation(BaseModel):
    """Source citation information."""
    doc_id: str
    filename: str
    chunk_index: int
    snippet: str
    score: float
    metadata: Optional[Dict[str, Any]] = None


class TokenUsage(BaseModel):
    """Token usage information."""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    answer: str
    sources: List[SourceCitation] = []
    usage: Optional[TokenUsage] = None
    follow_up: Optional[str] = None


class DocumentInfo(BaseModel):
    """Information about a document in the knowledge base."""
    doc_id: str
    filename: str
    size: int
    mime_type: str
    uploaded_at: datetime
    chunks: int
    tags: List[str] = []
    metadata: Optional[Dict[str, Any]] = None


class DocumentListResponse(BaseModel):
    """Response for document list endpoint."""
    items: List[DocumentInfo]
    total: int


class UploadResponse(BaseModel):
    """Response for document upload endpoint."""
    doc_id: str
    filename: str
    chunks: int
    message: str = "Document uploaded successfully"


class DeleteResponse(BaseModel):
    """Response for document deletion endpoint."""
    deleted: bool
    message: str = "Document deleted successfully"


class SettingsResponse(BaseModel):
    """Public settings response."""
    max_tokens: int
    chunk_size: int
    chunk_overlap: int
    top_k: int
    allowed_mime_types: List[str]
    max_file_size: int


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str = "1.0.0"
    timestamp: datetime
    services: Dict[str, str] = {}


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


# Internal models for RAG processing
class RetrievedChunk(BaseModel):
    """A retrieved chunk from the vector store."""
    doc_id: str
    filename: str
    chunk_index: int
    content: str
    score: float
    metadata: Dict[str, Any] = {}


class RAGContext(BaseModel):
    """Context for RAG processing."""
    query: str
    retrieved_chunks: List[RetrievedChunk] = []
    conversation_history: List[ChatMessage] = []
    rag_only: bool = True


class RAGResponse(BaseModel):
    """Internal RAG response."""
    answer: str
    citations: List[Dict[str, Any]] = []
    confidence: float = 0.0
    follow_up: Optional[str] = None
    usage: Optional[TokenUsage] = None
