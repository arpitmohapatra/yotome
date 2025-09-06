"""FastAPI main application for Atlas RAG Assistant."""

import os
import logging
import tempfile
from datetime import datetime
from typing import List, Optional
import asyncio
import uuid

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.security import HTTPBearer
import uvicorn

from rag import (
    settings,
    ChatRequest, ChatResponse, SourceCitation,
    DocumentInfo, DocumentListResponse, UploadResponse, DeleteResponse,
    SettingsResponse, HealthResponse, ErrorResponse,
    vector_store, document_processor, rag_graph
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Yotome RAG Assistant API",
    description="A production-ready RAG application with document management",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional security (stub implementation)
security = HTTPBearer(auto_error=False)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting Yotome RAG Assistant API...")
    
    # Ensure data directories exist
    os.makedirs(settings.chroma_persist_directory, exist_ok=True)
    
    # Test vector store connection
    try:
        stats = vector_store.get_document_stats()
        logger.info(f"Vector store initialized: {stats}")
    except Exception as e:
        logger.error(f"Failed to initialize vector store: {e}")
        raise
    
    logger.info("API startup complete")


@app.get("/api/healthz", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    try:
        # Check vector store
        stats = vector_store.get_document_stats()
        
        services = {
            "vector_store": "healthy" if "total_documents" in stats else "unhealthy",
            "rag_graph": "healthy"
        }
        
        return HealthResponse(
            status="healthy",
            timestamp=datetime.utcnow(),
            services=services
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.utcnow(),
            services={"error": str(e)}
        )


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Chat with the RAG assistant."""
    try:
        logger.info(f"Chat request: {len(request.messages)} messages, stream={request.stream}")
        
        if not request.messages:
            raise HTTPException(status_code=400, detail="No messages provided")
        
        # Get the latest user message
        user_message = None
        for msg in reversed(request.messages):
            if msg.role == "user":
                user_message = msg
                break
        
        if not user_message:
            raise HTTPException(status_code=400, detail="No user message found")
        
        # Process through RAG
        rag_response = await rag_graph.process_query(
            query=user_message.content,
            conversation_history=request.messages[:-1],  # Exclude the current message
            rag_only=request.rag_only
        )
        
        # Convert citations to API format
        sources = []
        for citation in rag_response.citations:
            source = SourceCitation(
                doc_id=citation.get("doc_id", ""),
                filename=citation.get("filename", ""),
                chunk_index=citation.get("chunk_index", 0),
                snippet=citation.get("snippet", ""),
                score=citation.get("score", 0.0),
                metadata=citation.get("metadata", {})
            )
            sources.append(source)
        
        response = ChatResponse(
            answer=rag_response.answer,
            sources=sources,
            usage=rag_response.usage,
            follow_up=rag_response.follow_up
        )
        
        logger.info(f"Chat response generated with {len(sources)} sources")
        return response
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/api/docs", response_model=DocumentListResponse)
async def list_documents():
    """List all documents in the knowledge base."""
    try:
        documents = vector_store.list_documents()
        
        return DocumentListResponse(
            items=documents,
            total=len(documents)
        )
        
    except Exception as e:
        logger.error(f"List documents error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")


@app.post("/api/docs/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    tags: Optional[str] = Form(None)
):
    """Upload a document to the knowledge base."""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Parse tags
        tag_list = []
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        
        # Detect MIME type
        mime_type = document_processor.detect_mime_type(file.filename, "")
        if file.content_type:
            mime_type = file.content_type
        
        # Read file size
        content = await file.read()
        file_size = len(content)
        
        # Validate file
        is_valid, error_msg = document_processor.validate_file(
            filename=file.filename,
            file_size=file_size,
            mime_type=mime_type
        )
        
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Save to temporary file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Process the document
            doc_id, chunks_added = await document_processor.process_file(
                file_path=temp_path,
                filename=file.filename,
                mime_type=mime_type,
                tags=tag_list
            )
            
            logger.info(f"Uploaded document {file.filename}: {chunks_added} chunks")
            
            return UploadResponse(
                doc_id=doc_id,
                filename=file.filename,
                chunks=chunks_added
            )
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.warning(f"Failed to delete temp file {temp_path}: {e}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload document error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")


@app.delete("/api/docs/{doc_id}", response_model=DeleteResponse)
async def delete_document(doc_id: str):
    """Delete a document from the knowledge base."""
    try:
        success = vector_store.delete_document(doc_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        logger.info(f"Deleted document {doc_id}")
        
        return DeleteResponse(deleted=True)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete document error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@app.get("/api/settings", response_model=SettingsResponse)
async def get_settings():
    """Get public application settings."""
    return SettingsResponse(
        max_tokens=settings.max_tokens,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        top_k=settings.top_k,
        allowed_mime_types=settings.allowed_mime_types,
        max_file_size=settings.max_file_size
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": "An unexpected error occurred"}
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower()
    )
