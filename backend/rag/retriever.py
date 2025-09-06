"""Vector store and retrieval functionality using ChromaDB."""

import os
import logging
from typing import List, Dict, Any, Optional, Tuple
import chromadb
from chromadb.config import Settings as ChromaSettings
import openai
from openai import AzureOpenAI
import hashlib
import uuid
from datetime import datetime

from .settings import settings
from .models import RetrievedChunk, DocumentInfo

logger = logging.getLogger(__name__)


class VectorStore:
    """ChromaDB vector store for document retrieval."""
    
    def __init__(self):
        self.client = None
        self.collection = None
        self.openai_client = None
        self._initialize()
    
    def _initialize(self):
        """Initialize ChromaDB client and collection."""
        try:
            # Ensure the data directory exists
            os.makedirs(settings.chroma_persist_directory, exist_ok=True)
            
            # Initialize ChromaDB client
            self.client = chromadb.PersistentClient(
                path=settings.chroma_persist_directory,
                settings=ChromaSettings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Get or create collection
            self.collection = self.client.get_or_create_collection(
                name="kb_default",
                metadata={"description": "Knowledge base documents"}
            )
            
            # Initialize Azure OpenAI client
            self.openai_client = AzureOpenAI(
                api_key=settings.azure_openai_api_key,
                api_version=settings.azure_openai_api_version,
                azure_endpoint=settings.azure_openai_endpoint
            )
            
            logger.info(f"Initialized ChromaDB with {self.collection.count()} documents")
            
        except Exception as e:
            logger.error(f"Failed to initialize vector store: {e}")
            raise
    
    def _get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings from Azure OpenAI."""
        try:
            response = self.openai_client.embeddings.create(
                input=texts,
                model=settings.azure_openai_embed_deployment
            )
            
            embeddings = [data.embedding for data in response.data]
            logger.debug(f"Generated {len(embeddings)} embeddings")
            return embeddings
            
        except Exception as e:
            logger.error(f"Failed to generate embeddings: {e}")
            raise
    
    def add_document(
        self,
        doc_id: str,
        filename: str,
        chunks: List[str],
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """Add document chunks to the vector store."""
        try:
            if not chunks:
                logger.warning(f"No chunks provided for document {doc_id}")
                return 0
            
            # Generate embeddings for all chunks
            embeddings = self._get_embeddings(chunks)
            
            # Prepare chunk IDs and metadata
            chunk_ids = []
            chunk_metadata = []
            
            base_metadata = metadata or {}
            base_metadata.update({
                "doc_id": doc_id,
                "filename": filename,
                "uploaded_at": datetime.utcnow().isoformat(),
                "total_chunks": len(chunks)
            })
            
            for i, chunk in enumerate(chunks):
                chunk_id = f"{doc_id}_{i}"
                chunk_ids.append(chunk_id)
                
                chunk_meta = base_metadata.copy()
                chunk_meta.update({
                    "chunk_index": i,
                    "chunk_id": chunk_id,
                    "content_hash": hashlib.md5(chunk.encode()).hexdigest()
                })
                chunk_metadata.append(chunk_meta)
            
            # Add to ChromaDB
            self.collection.add(
                ids=chunk_ids,
                embeddings=embeddings,
                documents=chunks,
                metadatas=chunk_metadata
            )
            
            logger.info(f"Added {len(chunks)} chunks for document {doc_id}")
            return len(chunks)
            
        except Exception as e:
            logger.error(f"Failed to add document {doc_id}: {e}")
            raise
    
    def search(
        self,
        query: str,
        top_k: int = None,
        doc_ids: Optional[List[str]] = None
    ) -> List[RetrievedChunk]:
        """Search for relevant chunks."""
        try:
            if top_k is None:
                top_k = settings.top_k
            
            # Generate query embedding
            query_embedding = self._get_embeddings([query])[0]
            
            # Prepare where clause for filtering
            where_clause = None
            if doc_ids:
                where_clause = {"doc_id": {"$in": doc_ids}}
            
            # Search ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_clause,
                include=["documents", "metadatas", "distances"]
            )
            
            # Convert results to RetrievedChunk objects
            chunks = []
            if results["documents"] and results["documents"][0]:
                documents = results["documents"][0]
                metadatas = results["metadatas"][0]
                distances = results["distances"][0]
                
                for doc, meta, distance in zip(documents, metadatas, distances):
                    # Convert distance to similarity score (ChromaDB uses cosine distance)
                    score = 1.0 - distance
                    
                    chunk = RetrievedChunk(
                        doc_id=meta.get("doc_id", "unknown"),
                        filename=meta.get("filename", "unknown"),
                        chunk_index=meta.get("chunk_index", 0),
                        content=doc,
                        score=score,
                        metadata=meta
                    )
                    chunks.append(chunk)
            
            logger.debug(f"Retrieved {len(chunks)} chunks for query: {query[:100]}...")
            return chunks
            
        except Exception as e:
            logger.error(f"Failed to search vector store: {e}")
            raise
    
    def delete_document(self, doc_id: str) -> bool:
        """Delete all chunks for a document."""
        try:
            # Get all chunk IDs for the document
            results = self.collection.get(
                where={"doc_id": doc_id},
                include=["metadatas"]
            )
            
            if not results["ids"]:
                logger.warning(f"No chunks found for document {doc_id}")
                return False
            
            # Delete all chunks
            chunk_ids = results["ids"]
            self.collection.delete(ids=chunk_ids)
            
            logger.info(f"Deleted {len(chunk_ids)} chunks for document {doc_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
            raise
    
    def list_documents(self) -> List[DocumentInfo]:
        """List all documents in the vector store."""
        try:
            # Get all document metadata
            results = self.collection.get(include=["metadatas"])
            
            if not results["metadatas"]:
                return []
            
            # Group by document ID
            doc_map = {}
            for meta in results["metadatas"]:
                doc_id = meta.get("doc_id")
                if not doc_id:
                    continue
                
                if doc_id not in doc_map:
                    doc_map[doc_id] = {
                        "doc_id": doc_id,
                        "filename": meta.get("filename", "unknown"),
                        "uploaded_at": meta.get("uploaded_at"),
                        "chunks": 0,
                        "size": 0,
                        "mime_type": meta.get("mime_type", "unknown"),
                        "tags": meta.get("tags", []),
                        "metadata": meta
                    }
                
                doc_map[doc_id]["chunks"] += 1
            
            # Convert to DocumentInfo objects
            documents = []
            for doc_data in doc_map.values():
                try:
                    uploaded_at = datetime.fromisoformat(doc_data["uploaded_at"]) if doc_data["uploaded_at"] else datetime.utcnow()
                except (ValueError, TypeError):
                    uploaded_at = datetime.utcnow()
                
                doc_info = DocumentInfo(
                    doc_id=doc_data["doc_id"],
                    filename=doc_data["filename"],
                    size=doc_data["size"],
                    mime_type=doc_data["mime_type"],
                    uploaded_at=uploaded_at,
                    chunks=doc_data["chunks"],
                    tags=doc_data["tags"] if isinstance(doc_data["tags"], list) else [],
                    metadata=doc_data["metadata"]
                )
                documents.append(doc_info)
            
            # Sort by upload date (newest first)
            documents.sort(key=lambda x: x.uploaded_at, reverse=True)
            
            logger.debug(f"Listed {len(documents)} documents")
            return documents
            
        except Exception as e:
            logger.error(f"Failed to list documents: {e}")
            raise
    
    def get_document_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector store."""
        try:
            total_chunks = self.collection.count()
            documents = self.list_documents()
            
            stats = {
                "total_documents": len(documents),
                "total_chunks": total_chunks,
                "avg_chunks_per_doc": total_chunks / len(documents) if documents else 0,
                "collection_name": self.collection.name
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get document stats: {e}")
            return {"error": str(e)}


# Global vector store instance
vector_store = VectorStore()
